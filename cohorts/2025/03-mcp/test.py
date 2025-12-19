import requests


url = "https://github.com/alexeygrigorev/minsearch"
jina_url = f"https://r.jina.ai/{url}"
response = requests.get(jina_url, timeout=30)
response.raise_for_status()
text = response.text
print("Character count:", len(text))