import requests
import re


url = "https://datatalks.club/"
jina_url = f"https://r.jina.ai/{url}"
response = requests.get(jina_url, timeout=30)
response.raise_for_status()
text = response.text


count = len(re.findall(r"\\bdata\\b", text, flags=re.IGNORECASE))
print("Occurrences of 'data':", count)