"""Minimal EPUB archives built as ZIP files (no ebooklib)."""

from __future__ import annotations

import base64
from html import escape
from io import BytesIO
import zipfile
from urllib.parse import quote

from PIL import Image

_LOCAL_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ba"
    "c1kAAAAASUVORK5CYII="
)


def _write_epub(
    archive: zipfile.ZipFile,
    *,
    opf_dir: str,
    package_xml: str,
    extra_files: dict[str, bytes | str],
) -> None:
    archive.writestr("mimetype", "application/epub+zip")
    container = (
        '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"'
        f' version="1.0"><rootfiles><rootfile full-path="{opf_dir}/package.opf"'
        ' media-type="application/oebps-package+xml"/></rootfiles></container>'
    )
    archive.writestr("META-INF/container.xml", container)
    archive.writestr(f"{opf_dir}/package.opf", package_xml)
    for path, payload in extra_files.items():
        if isinstance(payload, str):
            payload = payload.encode("utf-8")
        archive.writestr(path, payload)


def minimal_epub_bytes() -> bytes:
    opf_dir = "EPUB"
    package = (
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0"'
        ' unique-identifier="book-id"><metadata'
        ' xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:identifier id="book-id">test-epub</dc:identifier>'
        '<dc:title>Tiny EPUB</dc:title><dc:language>en</dc:language>'
        '<dc:creator>WeKnora</dc:creator>'
        '</metadata><manifest>'
        '<item id="chapter" href="text/chapter_01.xhtml"'
        ' media-type="application/xhtml+xml"/>'
        '<item id="pic" href="images/pic.png" media-type="image/png"/>'
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml"'
        ' properties="nav"/></manifest>'
        '<spine><itemref idref="chapter"/></spine></package>'
    )
    chapter = (
        "<html><body><h1>Chapter One</h1>"
        "<p>Hello EPUB world.</p>"
        '<p><a href="chapter_02.xhtml#sec2">Chapter 2</a> '
        '<a href="#footnote1">note</a> '
        '<a href="https://example.com">the site</a></p>'
        '<img alt="cover" src="../images/pic.png">'
        "</body></html>"
    )
    nav = (
        '<html xmlns="http://www.w3.org/1999/xhtml"><body><nav>'
        '<a href="text/chapter_01.xhtml">Chapter One</a></nav></body></html>'
    )
    output = BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        _write_epub(
            archive,
            opf_dir=opf_dir,
            package_xml=package,
            extra_files={
                f"{opf_dir}/text/chapter_01.xhtml": chapter,
                f"{opf_dir}/images/pic.png": b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR",
                f"{opf_dir}/nav.xhtml": nav,
            },
        )
    return output.getvalue()


def epub_with_chapter_body(body: str) -> bytes:
    opf_dir = "EPUB"
    package = (
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0"'
        ' unique-identifier="book-id"><metadata'
        ' xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:identifier id="book-id">structured-epub</dc:identifier>'
        '<dc:title>Structured EPUB</dc:title><dc:language>en</dc:language>'
        '</metadata><manifest>'
        '<item id="chapter" href="text/chapter.xhtml"'
        ' media-type="application/xhtml+xml"/></manifest>'
        '<spine><itemref idref="chapter"/></spine></package>'
    )
    chapter = f"<html><body><h1>Chapter</h1>{body}</body></html>"
    output = BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        _write_epub(
            archive,
            opf_dir=opf_dir,
            package_xml=package,
            extra_files={f"{opf_dir}/text/chapter.xhtml": chapter},
        )
    return output.getvalue()


def ordered_epub_bytes(
    manifest: list[str],
    spine: list[str],
    *,
    svg_cover_in_spine: bool = False,
) -> bytes:
    opf_dir = "EPUB"
    manifest_items = []
    extra: dict[str, bytes | str] = {}
    for name in manifest:
        manifest_items.append(
            f'<item id="{name}" href="text/{name}.xhtml"'
            ' media-type="application/xhtml+xml"/>'
        )
        extra[f"{opf_dir}/text/{name}.xhtml"] = (
            f"<html><body><p>Body of {name}.</p></body></html>"
        )
    if svg_cover_in_spine:
        manifest_items.append(
            '<item id="cover-svg" href="images/cover.svg"'
            ' media-type="image/svg+xml"/>'
        )
        extra[f"{opf_dir}/images/cover.svg"] = (
            '<svg xmlns="http://www.w3.org/2000/svg"><text>COVER ART</text></svg>'
        )
    spine_refs = "".join(f'<itemref idref="{name}"/>' for name in spine)
    if svg_cover_in_spine:
        spine_refs = '<itemref idref="cover-svg"/>' + spine_refs
    package = (
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0"'
        ' unique-identifier="book-id"><metadata'
        ' xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:identifier id="book-id">ordered-epub</dc:identifier>'
        '<dc:title>Ordered EPUB</dc:title><dc:language>en</dc:language>'
        f'</metadata><manifest>{"".join(manifest_items)}</manifest>'
        f"<spine>{spine_refs}</spine></package>"
    )
    output = BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        _write_epub(
            archive,
            opf_dir=opf_dir,
            package_xml=package,
            extra_files=extra,
        )
    return output.getvalue()


def epub_with_colliding_image_names(
    image_src: str, *, root_image_first: bool = False
) -> tuple[bytes, dict[str, bytes]]:
    opf_dir = "EPUB"
    directories = (
        ("root", "first", "second")
        if root_image_first
        else ("first", "second", "root")
    )
    image_data: dict[str, bytes] = {}
    manifest_items: list[str] = []
    spine_ids: list[str] = []
    extra: dict[str, bytes | str] = {}

    for directory in directories:
        index = ("first", "second", "root").index(directory)
        image = BytesIO()
        Image.new("RGB", (1, 1), (index * 100, 0, 0)).save(image, format="PNG")
        image_data[directory] = image.getvalue()
        if directory == "root":
            image_href = "pic.png"
            image_path = f"{opf_dir}/pic.png"
            chapter_href = "root.xhtml"
            chapter_path = f"{opf_dir}/root.xhtml"
            item_id = "root-chapter"
            image_id = "root-image"
        else:
            image_href = f"{directory}/pic.png"
            image_path = f"{opf_dir}/{directory}/pic.png"
            chapter_href = f"{directory}/chapter.xhtml"
            chapter_path = f"{opf_dir}/{directory}/chapter.xhtml"
            item_id = f"{directory}-chapter"
            image_id = f"{directory}-image"
        manifest_items.append(
            f'<item id="{image_id}" href="{image_href}" media-type="image/png"/>'
        )
        manifest_items.append(
            f'<item id="{item_id}" href="{chapter_href}"'
            ' media-type="application/xhtml+xml"/>'
        )
        spine_ids.append(item_id)
        extra[image_path] = image_data[directory]
        src = (
            "pic.png" if directory == "root" else image_src.format(directory=directory)
        )
        extra[chapter_path] = (
            f'<html><body><h1>{directory}</h1>'
            f'<img alt="{directory}" src="{src}">'
            "</body></html>"
        )

    package = (
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0"'
        ' unique-identifier="book-id"><metadata'
        ' xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:identifier id="book-id">colliding-images</dc:identifier>'
        '<dc:title>Images in separate directories</dc:title>'
        '<dc:language>en</dc:language></metadata><manifest>'
        f'{"".join(manifest_items)}</manifest><spine>'
        f'{"".join(f"<itemref idref=\"{item_id}\"/>" for item_id in spine_ids)}'
        "</spine></package>"
    )
    output = BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        _write_epub(
            archive,
            opf_dir=opf_dir,
            package_xml=package,
            extra_files=extra,
        )
    return output.getvalue(), image_data


def epub_with_literal_path_characters(
    chapter_path: str, image_src: str, image_path: str, decoy_path: str
) -> tuple[bytes, bytes]:
    """URI-encode manifest hrefs while preserving literal ZIP entry names."""
    opf_dir = "EPUB"
    container = (
        '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"'
        ' version="1.0"><rootfiles><rootfile full-path="EPUB/package.opf"'
        ' media-type="application/oebps-package+xml"/></rootfiles></container>'
    )
    package = (
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0"'
        ' unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:identifier id="id">literal-paths</dc:identifier>'
        '<dc:title>Literal paths</dc:title><dc:language>en</dc:language>'
        '<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>'
        '</metadata><manifest>'
        f'<item id="chapter" href="{quote(chapter_path)}"'
        ' media-type="application/xhtml+xml"/>'
        f'<item id="expected" href="{quote(image_path)}" media-type="image/png"/>'
        f'<item id="decoy" href="{quote(decoy_path)}" media-type="image/png"/>'
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml"'
        ' properties="nav"/></manifest><spine><itemref idref="chapter"/>'
        '</spine></package>'
    )
    chapter = (
        '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter</title>'
        '</head><body><h1>Chapter</h1>'
        f'<img alt="expected" src="{escape(image_src, quote=True)}"/>'
        '</body></html>'
    )
    nav = (
        '<html xmlns="http://www.w3.org/1999/xhtml"'
        ' xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title>'
        '</head><body><nav epub:type="toc"><ol><li>'
        f'<a href="{quote(chapter_path)}">Chapter</a>'
        '</li></ol></nav></body></html>'
    )
    expected = BytesIO()
    decoy = BytesIO()
    Image.new("RGB", (1, 1), "red").save(expected, format="PNG")
    Image.new("RGB", (1, 1), "blue").save(decoy, format="PNG")
    output = BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr("mimetype", "application/epub+zip")
        archive.writestr("META-INF/container.xml", container)
        archive.writestr(f"{opf_dir}/package.opf", package)
        archive.writestr(f"EPUB/{chapter_path}", chapter)
        archive.writestr(f"EPUB/{image_path}", expected.getvalue())
        archive.writestr(f"EPUB/{decoy_path}", decoy.getvalue())
        archive.writestr("EPUB/nav.xhtml", nav)
    return output.getvalue(), expected.getvalue()


def epub_with_external_image(src: str) -> bytes:
    opf_dir = "EPUB"
    package = (
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0"'
        ' unique-identifier="book-id"><metadata'
        ' xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:identifier id="book-id">external-image-collision</dc:identifier>'
        '<dc:title>External and local images</dc:title>'
        '<dc:language>en</dc:language></metadata><manifest>'
        '<item id="chapter" href="text/chapter.xhtml"'
        ' media-type="application/xhtml+xml"/>'
        '<item id="local-image" href="images/pic.png" media-type="image/png"/>'
        '</manifest><spine><itemref idref="chapter"/></spine></package>'
    )
    chapter = (
        "<html><body><h1>Images</h1><p>Different image sources.</p>"
        f'<img alt="external" src="{escape(src, quote=True)}"/>'
        '<img alt="local" src="../images/pic.png"/>'
        "</body></html>"
    )
    output = BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        _write_epub(
            archive,
            opf_dir=opf_dir,
            package_xml=package,
            extra_files={
                f"{opf_dir}/text/chapter.xhtml": chapter,
                f"{opf_dir}/images/pic.png": _LOCAL_PNG,
            },
        )
    return output.getvalue()
