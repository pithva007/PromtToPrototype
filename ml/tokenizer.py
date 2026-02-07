import re

def url_tokenizer(url: str) -> list:
    """
    URL-specific tokenizer that splits on URL separators and non-alphanumeric chars.
    Examples:
      'https://example.com/path?query=value' -> ['https', 'example', 'com', 'path', 'query', 'value']
    """
    # Split on common URL separators and non-alphanumeric boundaries
    # This regex matches any character that is NOT a word character (alphanumeric + underscore)
    tokens = re.split(r'[^\w]+', str(url).lower())
    # Remove empty strings
    return [token for token in tokens if token]
