import base64
import unittest

from docreader.parser.epub_parser import EPUBParser
from docreader.parser.registry import registry
from docreader.tests.epub_fixtures import (
    epub_with_chapter_body,
    epub_with_colliding_image_names,
    epub_with_literal_path_characters,
    minimal_epub_bytes,
    ordered_epub_bytes,
)


class EPUBParserTest(unittest.TestCase):
    def assert_literal_path_image_bytes(self):
        cases = (
            ("Text#1/chapter.xhtml", "../images/pic.png",
             "images/pic.png", "Text#1/cover.png"),
            ("Text?1/chapter.xhtml", "../images/pic.png",
             "images/pic.png", "Text?1/cover.png"),
            ("Text%231/chapter.xhtml", "pic.png",
             "Text%231/pic.png", "Text#1/pic.png"),
            ("Text/chapter.xhtml", "../images/pic%231.png?version=1#image",
             "images/pic#1.png", "images/pic#2.png"),
            ("Text/chapter.xhtml", "../images/pic%3F1.png?version=1#image",
             "images/pic?1.png", "images/pic?2.png"),
            ("Text/chapter.xhtml", "../images/pic%25231.png",
             "images/pic%231.png", "images/pic#1.png"),
            ("Text/chapter.xhtml", "../images/pic%231.png",
             "images/pic#1.png", "images/pic%231.png"),
            ("chapter.xhtml", "images/my%20pic.png",
             "images/my%20pic.png", "my pic.png"),
            ("Text/chapter.xhtml", "../images/my%20pic.png?version=1#image",
             "images/my%20pic.png", "my pic.png"),
            ("Text/chapter.xhtml", "images/my%20pic.png",
             "Text/images/my%20pic.png", "images/my pic.png"),
            ("Text/chapter.xhtml", "../images/my%20pic.png",
             "images/my pic.png", "images/my%20pic.png"),
            ("Text/chapter.xhtml", "%5Cimages/pic.png",
             "images/pic.png", "Text/images/pic.png"),
        )
        for chapter_path, image_src, image_path, decoy_path in cases:
            with self.subTest(chapter_path=chapter_path, image_src=image_src):
                content, expected = epub_with_literal_path_characters(
                    chapter_path, image_src, image_path, decoy_path
                )
                document = EPUBParser(
                    file_name="literal-paths.epub", file_type="epub"
                ).parse(content)
                self.assertEqual(len(document.images), 2)
                image_ref = next(
                    ref for ref, encoded in document.images.items()
                    if base64.b64decode(encoded) == expected
                )
                self.assertIn(f"![expected]({image_ref})", document.content)

    def test_literal_path_characters_are_preserved(self):
        self.assert_literal_path_image_bytes()

    def assert_chapter_image_bytes(self, document, image_data):
        self.assertEqual(len(document.images), 3)
        for directory, expected_data in image_data.items():
            image_ref = next(
                ref
                for ref, encoded in document.images.items()
                if base64.b64decode(encoded) == expected_data
            )
            self.assertIn(f"![{directory}]({image_ref})", document.content)

    def test_chapter_relative_images_win_over_colliding_aliases(self):
        for image_src in (
            "pic.png",
            "../{directory}/pic.png",
            "./pic%2Epng?version=1#image",
        ):
            with self.subTest(image_src=image_src):
                content, image_data = epub_with_colliding_image_names(image_src)
                document = EPUBParser(
                    file_name="colliding.epub", file_type="epub"
                ).parse(content)
                self.assert_chapter_image_bytes(document, image_data)

    def test_colliding_chapter_relative_images_with_root_first(self):
        for root_image_first in (False, True):
            with self.subTest(root_image_first=root_image_first):
                content, image_data = epub_with_colliding_image_names(
                    "pic.png", root_image_first=root_image_first
                )
                document = EPUBParser(
                    file_name="colliding.epub", file_type="epub"
                ).parse(content)
                self.assert_chapter_image_bytes(document, image_data)

    def test_root_image_alias_is_not_overwritten_by_nested_image_basenames(self):
        content, image_data = epub_with_colliding_image_names(
            "pic.png", root_image_first=True
        )
        document = EPUBParser(
            file_name="colliding.epub", file_type="epub"
        ).parse(content)
        self.assert_chapter_image_bytes(document, image_data)

    def test_parse_minimal_epub(self):
        document = EPUBParser(
            file_name="tiny.epub", file_type="epub"
        ).parse_into_text(minimal_epub_bytes())

        self.assertIn("Hello EPUB world", document.content)
        self.assertEqual(document.metadata["source_format"], "epub")
        self.assertEqual(len(document.images), 1)
        image_ref = next(iter(document.images))
        self.assertTrue(image_ref.startswith("images/"))
        self.assertIn(image_ref, document.content)
        self.assertNotIn("../images/pic.png", document.content)

    def test_internal_links_are_unwrapped_but_external_links_remain(self):
        document = EPUBParser(
            file_name="tiny.epub", file_type="epub"
        ).parse_into_text(minimal_epub_bytes())

        self.assertIn("Chapter 2", document.content)
        self.assertIn("note", document.content)
        self.assertNotIn("chapter_02.xhtml#sec2", document.content)
        self.assertNotIn("#footnote1", document.content)
        self.assertIn("[the site](https://example.com)", document.content)

    def test_parse_without_images(self):
        document = EPUBParser(
            file_name="tiny.epub", file_type="epub", extract_images=False
        ).parse_into_text(minimal_epub_bytes())

        self.assertEqual(document.images, {})

    def test_registry_resolves_epub(self):
        self.assertIs(registry.get_parser_class("", "epub"), EPUBParser)

    def test_chapters_follow_the_spine_not_the_manifest(self):
        document = EPUBParser(
            file_name="ordered.epub", file_type="epub"
        ).parse_into_text(
            ordered_epub_bytes(
                manifest=["three", "title", "one", "two"],
                spine=["title", "one", "two", "three"],
                svg_cover_in_spine=True,
            )
        )

        positions = [
            document.content.index(f"Body of {name}.")
            for name in ("title", "one", "two", "three")
        ]
        self.assertEqual(positions, sorted(positions))
        self.assertNotIn("COVER ART", document.content)

    def test_documents_outside_the_spine_follow_it(self):
        document = EPUBParser(
            file_name="ordered.epub", file_type="epub"
        ).parse_into_text(
            ordered_epub_bytes(
                manifest=["appendix", "two", "one"],
                spine=["one", "two"],
            )
        )

        positions = [
            document.content.index(f"Body of {name}.")
            for name in ("one", "two", "appendix")
        ]
        self.assertEqual(positions, sorted(positions))

    def test_a_document_listed_twice_in_the_spine_is_read_once(self):
        document = EPUBParser(
            file_name="ordered.epub", file_type="epub"
        ).parse_into_text(
            ordered_epub_bytes(manifest=["one", "two"], spine=["one", "two", "one"])
        )

        self.assertEqual(document.content.count("Body of one."), 1)

    def test_chapter_markdown_keeps_block_structure(self):
        content = epub_with_chapter_body(
            "<p>It was night.</p><hr/><p>Morning came.</p>"
            "<blockquote><p>A quoted line.</p></blockquote><p>After the quote.</p>"
            "<ul><li>parent<ul><li>child</li></ul></li></ul>"
            "<pre>def total(items):\n\n    return sum(items)\n</pre>"
            "<table><tr><th>Name</th><th>Qty</th></tr>"
            "<tr><td>Apple</td><td>3</td></tr></table>"
            "<p>After the table.</p>"
        )
        document = EPUBParser(
            file_name="structured.epub", file_type="epub"
        ).parse(content)

        self.assertIn("It was night.\n\n---\n\nMorning came.", document.content)
        self.assertIn("> A quoted line.\n\nAfter the quote.", document.content)
        self.assertIn("* parent\n  + child", document.content)
        self.assertIn(
            "```\ndef total(items):\n\n    return sum(items)\n```",
            document.content,
        )
        self.assertIn("| Apple | 3 |\n\nAfter the table.", document.content)


if __name__ == "__main__":
    unittest.main()
