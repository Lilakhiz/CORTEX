from uuid import uuid4

def normalize_google(results):

    evidence = []

    if not results:
        return evidence

    for item in results:

        evidence.append(
            {
                "id": str(uuid4()),
                "source": "google",
                "title": item.get("title", ""),
                "content": item.get("description", ""),
                "url": item.get("url", ""),
                "timestamp": None,
                "author": None,
                "score": None,
                "metadata": {}
            }
        )

    return evidence

def normalize_bing(results):

    evidence = []

    if not results:
        return evidence

    for item in results:

        evidence.append(
            {
                "id": str(uuid4()),
                "source": "bing",
                "title": item.get("title", ""),
                "content": item.get("description", ""),
                "url": item.get("url", ""),
                "timestamp": None,
                "author": None,
                "score": None,
                "metadata": {}
            }
        )

    return evidence

def normalize_reddit(results):

    evidence = []

    if not results:
        return evidence

    for item in results:

        evidence.append(
            {
                "id": str(uuid4()),
                "source": "reddit",
                "title": item.get("title", ""),
                "content": item.get("description", ""),
                "url": item.get("url", ""),
                "timestamp": None,
                "author": None,
                "score": None,
                "metadata": {}
            }
        )

    return evidence

def normalize_reddit_posts(posts):

    evidence = []

    if not posts:
        return evidence

    for post in posts:

        evidence.append(
            {
                "id": str(uuid4()),
                "source": "reddit_post",
                "title": post.get("title", ""),
                "content": post.get("content", ""),
                "url": post.get("url", ""),
                "timestamp": None,
                "author": post.get("author"),
                "score": post.get("score"),
                "metadata": {}
            }
        )

    return evidence

def normalize_github(results):

    evidence = []

    if not results:
        return evidence

    for repo in results:

        evidence.append(
            {
                "id": str(uuid4()),
                "source": "github",
                "title": repo.get("name", ""),
                "content": repo.get("description", ""),
                "url": repo.get("url", ""),
                "timestamp": None,
                "author": repo.get("owner"),
                "score": repo.get("stars"),
                "metadata":
                {
                    "language": repo.get("language"),
                    "stars": repo.get("stars")
                }
            }
        )

    return evidence

def normalize_wikipedia(results):

    evidence = []

    if not results:
        return evidence

    for article in results:

        evidence.append(
            {
                "id": str(uuid4()),
                "source": "wikipedia",
                "title": article.get("title", ""),
                "content": article.get("summary", ""),
                "url": article.get("url", ""),
                "timestamp": None,
                "author": None,
                "score": None,
                "metadata": {
                    "categories": article.get("categories", []),
                    "links": article.get("links", []),
                },
            }
        )

    return evidence

def normalize_news(results):

    evidence = []

    if not results:
        return evidence

    for article in results:

        evidence.append(
            {
                "id": str(uuid4()),
                "source": "news",
                "title": article.get("title", ""),
                "content": article.get("description", ""),
                "url": article.get("url", ""),
                "timestamp": article.get("published"),
                "author": article.get("author"),
                "score": None,
                "metadata":
                {
                    "publisher": article.get("source")
                }
            }
        )

    return evidence

def normalize_youtube(results):

    evidence = []

    if not results:
        return evidence

    for video in results:

        evidence.append(
            {
                "id": str(uuid4()),
                "source": "youtube",
                "title": video.get("title", ""),
                "content": video.get("description", ""),
                "url": video.get("url", ""),
                "timestamp": None,
                "author": None,
                "score": None,
                "metadata": {}
            }
        )

    return evidence

def normalize_government(results):

    evidence = []

    if not results:
        return evidence

    for page in results:

        evidence.append(
            {
                "id": str(uuid4()),
                "source": "government",
                "title": page.get("title", ""),
                "content": page.get("description", ""),
                "url": page.get("url", ""),
                "timestamp": None,
                "author": None,
                "score": None,
                "metadata": {}
            }
        )

    return evidence

def collect_evidence(state):

    evidence = []

    evidence.extend(normalize_google(state.get("google_results")))
    evidence.extend(normalize_bing(state.get("bing_results")))
    evidence.extend(normalize_reddit(state.get("reddit_results")))
    evidence.extend(normalize_reddit_posts(state.get("reddit_post_data")))
    evidence.extend(normalize_github(state.get("github_results")))
    evidence.extend(normalize_wikipedia(state.get("wikipedia_results")))
    evidence.extend(normalize_news(state.get("news_results")))
    evidence.extend(normalize_youtube(state.get("youtube_results")))
    evidence.extend(normalize_government(state.get("government_results")))

    return evidence

