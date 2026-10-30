"""EPUB parser.

Parses EPUB files into markdown text and optional embedded images.
"""

import base64
import logging
import os
import posixpath
import re
import tempfile
import uuid
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO
from typing import Dict, List, Optional, Tuple
from urllib.parse import unquote, urlsplit

from bs4 import BeautifulSoup

from docreader.models.document import Document
from docreader.parser.base_parser import BaseParser
from docreader.parser.mhtml_parser import MHTMLParser

logger = logging.getLogger(__name__)

_CONTAINER_NS = {"cn": "urn:oasis:names:tc:opendocument:xmlns:container"}
_OPF_NS = "http://www.idpf.org/2007/opf"
_DC_NS = "http://purl.org/dc/elements/1.1/"

_HTML_MEDIA_TYPES = frozenset(
    {
        "application/xhtml+xml",
        "application/xhtml",
        "text/html",
        "application/html+xml",
    }
)

_IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg")


class EPUBParser(BaseParser):
    """Parser for EPUB e-book files."""

    def __init__(self, *args, extract_images: bool = True, **kwargs):
        super().__init__(*args, **kwargs)
        self.extract_images = extract_images

    def parse_into_text(self, content: bytes) -> Document:
        logger.info(
            "Parsing EPUB file: %s, size: %d bytes", self.file_name, len(content)
        )
        return self._parse_epub_zip(content)

    def _parse_epub_zip(self, content: bytes) -> Document:
        """Parse EPUB as a ZIP archive (OPF spine, manifest, and embedded assets)."""
        metadata: Dict[str, str] = {
            "source_format": "epub",
            "file_size": len(content),
        }
        images: Dict[str, str] = {}
        image_aliases: Dict[str, str] = {}
        markdown_parts: List[str] = []

        with zipfile.ZipFile(BytesIO(content), "r") as epub_zip:
            zip_names = set(epub_zip.namelist())
            opf_path, opf_root = self._load_opf(epub_zip)
            opf_dir = posixpath.dirname(opf_path) if opf_path else ""
            if opf_root is not None:
                metadata.update(self._extract_opf_metadata(opf_root))
                manifest = self._parse_manifest(opf_root, opf_dir, zip_names)
                spine_ids = self._parse_spine(opf_root)
                html_paths = self._html_paths_in_reading_order(
                    manifest, spine_ids, epub_zip
                )
            else:
                manifest = {}
                html_paths = self._fallback_html_paths(epub_zip)

            if self.extract_images:
                self._extract_images_from_zip(
                    epub_zip, manifest, opf_dir, images, image_aliases
                )

            for toc_index, archive_path in enumerate(html_paths):
                try:
                    html_content = epub_zip.read(archive_path).decode(
                        "utf-8", errors="ignore"
                    )
                    chapter_md = self._process_chapter_html(
                        html_content,
                        archive_path,
                        toc_index=toc_index,
                        image_aliases=image_aliases,
                        opf_dir=opf_dir,
                    )
                    if chapter_md.strip():
                        markdown_parts.append(chapter_md)
                except Exception as e:
                    logger.warning("Failed to process %s: %s", archive_path, e)

        metadata["chapter_count"] = len(markdown_parts)
        metadata["image_count"] = len(images)
        return Document(
            content="\n\n".join(markdown_parts), images=images, metadata=metadata
        )

    def _load_opf(
        self, epub_zip: zipfile.ZipFile
    ) -> Tuple[Optional[str], Optional[ET.Element]]:
        try:
            container_xml = epub_zip.read("META-INF/container.xml")
        except KeyError:
            logger.warning("EPUB missing META-INF/container.xml")
            return None, None
        try:
            container = ET.fromstring(container_xml)
        except ET.ParseError as e:
            logger.warning("Invalid container.xml: %s", e)
            return None, None
        rootfile = container.find(".//cn:rootfile", _CONTAINER_NS)
        if rootfile is None:
            return None, None
        opf_path = rootfile.get("full-path")
        if not opf_path:
            return None, None
        try:
            opf_bytes = epub_zip.read(opf_path)
            return opf_path, ET.fromstring(opf_bytes)
        except (KeyError, ET.ParseError) as e:
            logger.warning("Failed to read OPF at %s: %s", opf_path, e)
            return opf_path, None

    def _extract_opf_metadata(self, opf_root: ET.Element) -> Dict[str, str]:
        metadata: Dict[str, str] = {}
        mapping = {
            "title": "title",
            "creator": "author",
            "publisher": "publisher",
            "language": "language",
            "description": "description",
            "date": "date",
            "identifier": "isbn",
        }
        meta_el = opf_root.find(f"{{{_OPF_NS}}}metadata")
        if meta_el is None:
            return metadata
        for dc_key, out_key in mapping.items():
            values = [
                (el.text or "").strip()
                for el in meta_el.findall(f"{{{_DC_NS}}}{dc_key}")
                if (el.text or "").strip()
            ]
            if not values:
                continue
            if out_key == "author":
                metadata[out_key] = ", ".join(values)
            else:
                metadata[out_key] = values[0]
        return metadata

    @staticmethod
    def _parse_manifest(
        opf_root: ET.Element, opf_dir: str, zip_names: set[str]
    ) -> Dict[str, Dict[str, str]]:
        manifest: Dict[str, Dict[str, str]] = {}
        manifest_el = opf_root.find(f"{{{_OPF_NS}}}manifest")
        if manifest_el is None:
            return manifest
        for item in manifest_el.findall(f"{{{_OPF_NS}}}item"):
            item_id = item.get("id")
            href = item.get("href")
            if not item_id or not href:
                continue
            archive_path = EPUBParser._resolve_manifest_href(opf_dir, href, zip_names)
            manifest[item_id] = {
                "href": href,
                "path": archive_path,
                "media_type": item.get("media-type") or "",
                "properties": item.get("properties") or "",
            }
        return manifest

    @staticmethod
    def _resolve_manifest_href(
        opf_dir: str, href: str, zip_names: set[str]
    ) -> str:
        """Map an OPF manifest href to the literal ZIP entry path."""
        candidates: List[str] = []
        for raw_href in (href, unquote(href)):
            joined = (
                posixpath.join(opf_dir, raw_href) if opf_dir else raw_href
            )
            candidates.append(EPUBParser._normalize_epub_path(joined))
        for path in candidates:
            if path in zip_names:
                return path
        return candidates[0]

    @staticmethod
    def _parse_spine(opf_root: ET.Element) -> List[str]:
        spine_el = opf_root.find(f"{{{_OPF_NS}}}spine")
        if spine_el is None:
            return []
        return [
            ref.get("idref")
            for ref in spine_el.findall(f"{{{_OPF_NS}}}itemref")
            if ref.get("idref")
        ]

    def _html_paths_in_reading_order(
        self,
        manifest: Dict[str, Dict[str, str]],
        spine_ids: List[str],
        epub_zip: zipfile.ZipFile,
    ) -> List[str]:
        documents = [
            entry
            for entry in manifest.values()
            if self._is_html_chapter(entry) and entry["path"] in epub_zip.namelist()
        ]
        ordered: List[str] = []
        seen: set[str] = set()
        for idref in spine_ids:
            entry = manifest.get(idref)
            if entry is None or not self._is_html_chapter(entry):
                continue
            path = entry["path"]
            if path not in seen:
                ordered.append(path)
                seen.add(path)
        for entry in documents:
            path = entry["path"]
            if path not in seen:
                ordered.append(path)
                seen.add(path)
        return ordered

    @staticmethod
    def _is_html_chapter(entry: Dict[str, str]) -> bool:
        media_type = entry.get("media_type") or ""
        if media_type not in _HTML_MEDIA_TYPES:
            return False
        properties = entry.get("properties") or ""
        if "nav" in properties.split():
            return False
        return True

    @staticmethod
    def _fallback_html_paths(epub_zip: zipfile.ZipFile) -> List[str]:
        html_files = [
            f
            for f in epub_zip.namelist()
            if f.endswith((".html", ".xhtml", ".htm"))
        ]

        def chapter_num(filename: str) -> int:
            match = re.search(r"chapter(\d+)", filename, re.IGNORECASE)
            return int(match.group(1)) if match else 999999

        html_files.sort(key=chapter_num)
        return html_files

    def _extract_images_from_zip(
        self,
        epub_zip: zipfile.ZipFile,
        manifest: Dict[str, Dict[str, str]],
        opf_dir: str,
        images: Dict[str, str],
        image_aliases: Dict[str, str],
    ) -> None:
        candidates: set[str] = {
            name
            for name in epub_zip.namelist()
            if name.lower().endswith(_IMAGE_EXTENSIONS)
        }
        for entry in manifest.values():
            media_type = entry.get("media_type") or ""
            if media_type.startswith("image/") or entry["path"].lower().endswith(
                _IMAGE_EXTENSIONS
            ):
                if entry["path"] in epub_zip.namelist():
                    candidates.add(entry["path"])
        for img_file in sorted(candidates):
            if img_file not in epub_zip.namelist():
                continue
            try:
                img_data = epub_zip.read(img_file)
                ext = os.path.splitext(img_file)[1]
                img_path = f"images/{uuid.uuid4().hex}{ext}"
                images[img_path] = base64.b64encode(img_data).decode("utf-8")
                self._add_image_aliases(
                    image_aliases, img_file, img_path, opf_dir=opf_dir
                )
            except Exception as e:
                logger.warning("Failed to extract image %s: %s", img_file, e)

    def _process_chapter_html(
        self,
        html_content: str,
        archive_path: str,
        toc_index: int = 0,
        image_aliases: Dict[str, str] | None = None,
        opf_dir: str = "",
    ) -> str:
        try:
            soup = BeautifulSoup(html_content, "lxml")
            title_tag = soup.find(["h1", "h2"])
            if title_tag:
                chapter_title = title_tag.get_text().strip()
                title_tag.decompose()
            else:
                chapter_title = os.path.basename(archive_path)
                chapter_title = chapter_title.replace(".xhtml", "").replace(".html", "")
                chapter_title = chapter_title.replace("-", " ").title()
            body_html = str(soup.body) if soup.body else html_content
            rel_chapter = archive_path
            if opf_dir and archive_path.startswith(f"{opf_dir}/"):
                rel_chapter = archive_path[len(opf_dir) + 1 :]
            chapter_md = self._html_to_markdown(
                body_html,
                image_aliases=image_aliases,
                base_path=posixpath.dirname(rel_chapter),
            )
            return f"## {chapter_title}\n\n{chapter_md}"
        except Exception as e:
            logger.error("Failed to process chapter %s: %s", archive_path, e)
            return f"## Chapter {toc_index + 1}\n\n[Error processing chapter: {e}]"

    def _html_to_markdown(
        self,
        html_content: str,
        image_aliases: Dict[str, str] | None = None,
        base_path: str = "",
    ) -> str:
        try:
            from bs4 import Comment
            from markdownify import markdownify as md

            soup = BeautifulSoup(html_content, "lxml")
            for element in soup(["script", "style"]):
                element.decompose()
            for comment in soup.find_all(
                string=lambda text: isinstance(text, Comment)
            ):
                comment.extract()
            self._strip_internal_links(soup)
            if image_aliases:
                self._rewrite_image_sources(soup, image_aliases, base_path)
            markdown_text = md(str(soup), heading_style="ATX")
            return MHTMLParser._normalize_markdown(markdown_text)
        except ImportError:
            logger.warning("markdownify not available, using HTML as-is")
            return f"```html\n{html_content}\n```"
        except Exception as e:
            logger.error("HTML to Markdown conversion failed: %s", e)
            return f"```html\n{html_content}\n```"

    @staticmethod
    def _strip_internal_links(soup: BeautifulSoup) -> None:
        """Unwrap links that don't point to an external resource."""
        external = ("http://", "https://", "mailto:", "tel:")
        for link in soup.find_all("a"):
            href = (link.get("href") or "").strip().lower()
            if not href or not href.startswith(external):
                link.unwrap()

    @staticmethod
    def _add_image_aliases(
        image_aliases: Dict[str, str],
        original_path: str,
        image_path: str,
        opf_dir: str = "",
    ) -> None:
        normalized = EPUBParser._normalize_epub_path(original_path)
        aliases = {
            original_path,
            normalized,
        }
        if opf_dir:
            prefix = f"{opf_dir}/"
            if original_path.startswith(prefix):
                rel = original_path[len(prefix) :]
                aliases.add(rel)
                aliases.add(EPUBParser._normalize_epub_path(rel))
        for alias in aliases:
            if alias:
                image_aliases[alias] = image_path
        image_aliases.setdefault(posixpath.basename(normalized), image_path)

    @staticmethod
    def _rewrite_image_sources(
        soup: BeautifulSoup,
        image_aliases: Dict[str, str],
        base_path: str = "",
    ) -> None:
        for img in soup.find_all("img"):
            src = (img.get("src") or "").strip()
            if not src:
                continue
            try:
                reference = urlsplit(src)
            except ValueError:
                continue
            if reference.scheme or reference.netloc:
                continue
            raw_path = src.split("#", 1)[0].split("?", 1)[0].replace("\\", "/")
            src_path = unquote(raw_path).replace("\\", "/")
            normalized_src = EPUBParser._normalize_epub_path(src_path)
            raw_normalized = EPUBParser._normalize_epub_path(raw_path)
            candidates = [normalized_src, raw_normalized]
            if base_path:
                joined = EPUBParser._normalize_epub_path(
                    posixpath.join(base_path, src_path)
                )
                raw_joined = EPUBParser._normalize_epub_path(
                    posixpath.join(base_path, raw_path)
                )
                candidates[:0] = [joined, raw_joined]
            candidates.append(posixpath.basename(normalized_src))
            for candidate in candidates:
                if candidate in image_aliases:
                    img["src"] = image_aliases[candidate]
                    break

    @staticmethod
    def _normalize_epub_path(path: str) -> str:
        """Normalize a decoded archive path without interpreting it as a URI."""
        normalized = posixpath.normpath(path.replace("\\", "/"))
        return "" if normalized == "." else normalized.lstrip("/")
