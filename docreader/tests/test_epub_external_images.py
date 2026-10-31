import base64
import unittest

from docreader.parser.epub_parser import EPUBParser
from docreader.tests.epub_fixtures import epub_with_external_image

_LOCAL_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ba"
    "c1kAAAAASUVORK5CYII="
)


class EPUBExternalImageTest(unittest.TestCase):
    def assert_external_images_preserved(self):
        sources = (
            "https://example.com/pic.png",
            "HTTP://example.com/pic.png?size=large#image",
            "//example.com/pic.png",
            "https://example.com/images/pic.png",
            "https://[malformed/pic.png",
            "data:image/png;base64," + base64.b64encode(_LOCAL_PNG).decode(),
        )
        for src in sources:
            with self.subTest(src=src):
                parser = EPUBParser(file_name="images.epub", file_type="epub")
                content = epub_with_external_image(src)
                document = parser.parse(content)
                self.assertIn(f"![external]({src})", document.content)
                self.assertEqual(len(document.images), 1)
                local_ref, encoded = next(iter(document.images.items()))
                self.assertEqual(base64.b64decode(encoded), _LOCAL_PNG)
                self.assertIn(f"![local]({local_ref})", document.content)

    def test_external_images_are_not_replaced_by_local_basename(self):
        self.assert_external_images_preserved()


if __name__ == "__main__":
    unittest.main()
