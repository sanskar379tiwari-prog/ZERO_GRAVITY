"""Resume Parser
Support for multiple input formats: PDF, HTML, plain text, markdown.
"""
import re
import base64
from typing import Optional
import fitz  # PyMuPDF
from html.parser import HTMLParser


class PDFParser:
    """Extract text from PDF."""
    
    @staticmethod
    def parse(pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes."""
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text = ""
            for page_num in range(len(doc)):
                page = doc[page_num]
                text += page.get_text()
            return text.strip()
        except Exception as e:
            raise ValueError(f"PDF parsing failed: {e}")


class HTMLParser_(HTMLParser):
    """Extract text from HTML."""
    
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip_tags = {"script", "style"}
        self.current_tag = None
    
    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
    
    def handle_data(self, data):
        if self.current_tag not in self.skip_tags:
            text = data.strip()
            if text:
                self.text.append(text)
    
    @staticmethod
    def parse(html: str) -> str:
        """Extract text from HTML."""
        parser = HTMLParser_()
        try:
            parser.feed(html)
            return "\n".join(parser.text).strip()
        except Exception as e:
            raise ValueError(f"HTML parsing failed: {e}")


class MarkdownParser:
    """Clean markdown markers."""
    
    @staticmethod
    def parse(text: str) -> str:
        """Remove markdown formatting."""
        # Remove markdown headers
        text = re.sub(r"^#+\s+", "", text, flags=re.MULTILINE)
        # Remove bold/italic
        text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
        text = re.sub(r"__(.+?)__", r"\1", text)
        text = re.sub(r"\*(.+?)\*", r"\1", text)
        text = re.sub(r"_(.+?)_", r"\1", text)
        # Remove links
        text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)
        # Remove inline code
        text = re.sub(r"`(.+?)`", r"\1", text)
        # Remove code blocks
        text = re.sub(r"```[\s\S]*?```", "", text)
        return text.strip()


def parse_resume(content: str | bytes, format: Optional[str] = None) -> str:
    """
    Parse resume in any format to plain text.
    
    Args:
        content: Resume content (string for text/html/md, bytes for PDF)
        format: Optional format hint: "pdf", "html", "markdown", "text"
    
    Returns:
        Plain text resume content
    """
    # Auto-detect format
    if format is None:
        if isinstance(content, bytes):
            format = "pdf"
        elif isinstance(content, str):
            stripped = content.strip()
            if stripped.startswith("%PDF"):
                format = "pdf"
            else:
                # Try base64 PDF detection
                try:
                    decoded = base64.b64decode(stripped, validate=True)
                    if decoded[:4] == b"%PDF":
                        content = decoded
                        format = "pdf"
                    elif "<html" in stripped.lower() or "<body" in stripped.lower():
                        format = "html"
                    elif re.match(r"^#+\s+", stripped):
                        format = "markdown"
                    else:
                        format = "text"
                except Exception:
                    if "<html" in stripped.lower() or "<body" in stripped.lower():
                        format = "html"
                    elif re.match(r"^#+\s+", stripped):
                        format = "markdown"
                    else:
                        format = "text"
        else:
            format = "text"

    # Parse
    if format == "pdf":
        if isinstance(content, str):
            # Accept raw PDF text or base64 PDF string.
            if content.strip().startswith("%PDF"):
                content = content.encode("utf-8", errors="ignore")
            else:
                try:
                    content = base64.b64decode(content, validate=True)
                except Exception:
                    content = content.encode("utf-8", errors="ignore")
        return PDFParser.parse(content)
    elif format == "html":
        return HTMLParser_.parse(content if isinstance(content, str) else content.decode(errors="ignore"))
    elif format == "markdown":
        return MarkdownParser.parse(content if isinstance(content, str) else content.decode(errors="ignore"))
    else:  # text
        return content if isinstance(content, str) else content.decode(errors="ignore")
