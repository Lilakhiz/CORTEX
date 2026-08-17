from dotenv import load_dotenv
import os
import requests
from urllib.parse import quote_plus
import wikipediaapi

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")


def serp_search(query, engine="google"):
    payload = {
        "api_key": os.getenv("TAVILY_API_KEY"),
        "query": query,
        "topic": "general",
        "search_depth": "advanced",
        "max_results": 3,
        "include_answer": True,
        "include_images": False,
        "include_raw_content": True,
    }

    response = requests.post(
        "https://api.tavily.com/search",
        json=payload,
        timeout=30,
        verify=False,
    )

    response.raise_for_status()
    data = response.json()

    return [
        {
            "title": r["title"],
            "url": r["url"],
            "content": r["content"],
        }
        for r in data["results"]
    ]


def reddit_search_api(keyword, max_results=10):
    payload = {
        "api_key": os.getenv("TAVILY_API_KEY"),
        "query": f"{keyword} site:reddit.com",
        "topic": "general",
        "search_depth": "advanced",
        "max_results": max_results,
    }

    response = requests.post(
        "https://api.tavily.com/search",
        json=payload,
        timeout=30,
        verify=False,
    )

    response.raise_for_status()
    data = response.json()

    posts = []

    for r in data["results"]:
        if "reddit.com" in r["url"]:
            posts.append(
                {
                    "title": r["title"],
                    "url": r["url"],
                }
            )

    return posts


def reddit_post_retrieval(urls):
    posts = []

    for url in urls:
        reader = "https://r.jina.ai/http://" + url.replace("https://", "")
        response = requests.get(reader, timeout=20, verify=False)

        posts.append(
            {
                "url": url,
                "content": response.text[:1500],
            }
        )

    return posts


def github_search(query: str):

    url = "https://api.github.com/search/repositories"

    params = {
        "q": query,
        "sort": "stars",
        "order": "desc",
        "per_page": 5,
    }

    headers = {
        "Accept": "application/vnd.github+json"
    }

    try:

        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=15,
            verify=False,
        )

        response.raise_for_status()

        repositories = response.json()["items"]

        results = []

        for repo in repositories:

            results.append(
                {
                    "title": repo["full_name"],
                    "content": repo["description"] or "",
                    "url": repo["html_url"],
                    "stars": repo["stargazers_count"],
                    "language": repo["language"],
                    "updated": repo["updated_at"],
                }
            )

        return results

    except Exception as e:

        print(f"GitHub search failed: {e}")

        return []


def wikipedia_search(query: str):

    wiki = wikipediaapi.Wikipedia(
        language="en",
        user_agent="Cortex/1.0 (akhilesh@example.com)"
    )

    page = wiki.page(query)

    if not page.exists():
        return []

    return [
        {
            "title": page.title,
            "content": page.summary[:3000],
            "url": page.fullurl,
            "categories": list(page.categories.keys())[:10],
            "links": list(page.links.keys())[:20],
        }
    ]


def news_search(query: str):

    url = "https://newsapi.org/v2/everything"

    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 5,
        "apiKey": NEWS_API_KEY,
    }

    try:

        response = requests.get(
            url,
            params=params,
            timeout=15,
            verify=False,
        )

        if response.status_code != 200:
            print(response.status_code)
            print(response.text)
            return []

        articles = response.json().get("articles", [])

        TRUSTED_SOURCES = {
            "Reuters",
            "BBC News",
            "Associated Press",
            "Bloomberg",
            "The Wall Street Journal",
            "Financial Times",
            "TechCrunch",
            "The Verge",
        }

        results = []

        for article in articles:

            source_name = article["source"]["name"]
            if source_name not in TRUSTED_SOURCES:
                continue

            results.append(
                {
                    "title": article["title"],
                    "content": article["description"] or "",
                    "url": article["url"],
                    "published": article["publishedAt"],
                    "source": source_name,
                }
            )

        return results

    except Exception as e:

        print(f"News search failed: {e}")

        return []


def youtube_search(query: str):
    import requests

    payload = {
        "api_key": os.getenv("TAVILY_API_KEY"),
        "query": f"{query} site:youtube.com",
        "topic": "general",
        "search_depth": "advanced",
        "max_results": 5,
    }

    response = requests.post(
        "https://api.tavily.com/search",
        json=payload,
        timeout=30,
        verify=False,
    )

    response.raise_for_status()
    data = response.json()

    videos = []

    for result in data["results"]:
        if "youtube.com" in result["url"] or "youtu.be" in result["url"]:
            videos.append(
                {
                    "title": result["title"],
                    "url": result["url"],
                    "content": result["content"],
                }
            )

    return videos


def government_search(query: str):

    payload = {
        "api_key": os.getenv("TAVILY_API_KEY"),
        "query": query,
        "topic": "general",
        "search_depth": "advanced",
        "max_results": 5,
        "include_answer": False,
        "include_images": False,
        "include_raw_content": True,
        "include_domains": [
            "gov.in",
            "nic.in",
            "pib.gov.in",
            "egazette.nic.in",
        ],
    }

    response = requests.post(
        "https://api.tavily.com/search",
        json=payload,
        timeout=30,
        verify=False,
    )

    response.raise_for_status()

    data = response.json()

    return [
        {
            "title": r["title"],
            "url": r["url"],
            "content": r["content"],
        }
        for r in data["results"]
    ]