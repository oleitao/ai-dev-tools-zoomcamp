import zipfile
from pathlib import Path
import requests
from minsearch import Index

DATA_DIR = Path("data")
ZIP_PATH = DATA_DIR / "fastmcp-main.zip"
REPO_URL = "https://github.com/jlowin/fastmcp/archive/refs/heads/main.zip"

def download_repo():
    DATA_DIR.mkdir(exist_ok=True)
    if ZIP_PATH.exists():
        return
    r = requests.get(REPO_URL, timeout=60)
    r.raise_for_status()
    ZIP_PATH.write_bytes(r.content)

def load_docs():
    docs = []
    with zipfile.ZipFile(ZIP_PATH) as z:
        for name in z.namelist():
            if not (name.endswith(".md") or name.endswith(".mdx")):
                continue
            if name.endswith("/"):
                continue
            short_name = name.split("/", 1)[1]
            content = z.read(name).decode("utf-8", errors="ignore")
            docs.append({"filename": short_name, "content": content})
    return docs

def main():
    download_repo()
    docs = load_docs()
    index = Index(text_fields=["content"], keyword_fields=["filename"])
    index.fit(docs)
    results = index.search("demo", num_results=5)
    for r in results:
        print(r["filename"])

if __name__ == "__main__":
    main()