import re
from functools import lru_cache

from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering


# STEP 1: Load the pretrained AI model
@lru_cache(maxsize=1)
def get_model():
    return SentenceTransformer(
        "sentence-transformers/all-MiniLM-L6-v2"
    )


# STEP 2: Remove timestamps and severity labels
def clean_log(log):

    # Remove timestamps
    log = re.sub(
        r"^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+",
        "",
        log
    )

    # Remove ERROR or CRITICAL labels
    log = re.sub(
        r"^(ERROR|CRITICAL)\s+",
        "",
        log,
        flags=re.IGNORECASE
    )

    return log.strip()

def calculate_priority(messages):

    count = len(messages)

    # Critical or fatal errors
    if any(
        "CRITICAL" in msg.upper() or "FATAL" in msg.upper()
        for msg in messages
    ):
        return "P1"

    # Frequently repeated errors
    if count >= 5:
        return "P2"

    # Less frequent errors
    return "P3"
def extract_service(log):

    match = re.search(
        r"\bservice\s*[:=]\s*([A-Za-z0-9_.-]+)",
        log,
        flags=re.IGNORECASE
    )

    if match:
        return match.group(1)

    return None

# STEP 14: Suggest possible root causes
def suggest_root_cause(messages):

    # Possible error categories and explanations
    causes = [
        (
            ["authentication", "unauthorized", "token", "credential", "auth-api"],
            "Authentication may be failing because of invalid credentials, an expired token, or an authentication service problem."
        ),
        (
            ["database", "postgres", "mysql", "db-", "database-api"],
            "The database may be unreachable, overloaded, or rejecting connections."
        ),
        (
            ["timeout", "timed out", "connection refused"],
            "A network delay, unavailable upstream service, or overloaded server may be causing the failure."
        ),
        (
            ["payment", "gateway"],
            "The payment service or an external payment provider may be unavailable."
        )
    ]

    # Find evidence supporting a possible cause
    for keywords, cause in causes:

        evidence = [
            message
            for message in messages
            if any(
                keyword in clean_log(message).lower()
                for keyword in keywords
            )
        ]

        if evidence:
            return {
                "possible_cause": cause,
                "evidence": evidence[:3],
                "status": "Unverified hypothesis"
            }

    # No recognizable cause found
    return {
        "possible_cause": "Insufficient information to identify a possible root cause.",
        "evidence": [],
        "status": "Unknown"
    }
# STEP 15: Generate troubleshooting recommendations

def recommend_solutions(messages):

    # Combine all incident messages
    text = " ".join(messages).lower()

    # Authentication problems
    if any(word in text for word in [
        "authentication",
        "unauthorized",
        "invalid token",
        "credential",
        "auth-api"
    ]):

        return {
            "category": "Authentication Failure",
            "recommended_actions": [
                "Verify authentication credentials.",
                "Check whether access tokens have expired.",
                "Inspect authentication service logs.",
                "Check authentication server availability."
            ]
        }

    # Database problems
    elif any(word in text for word in [
        "database",
        "postgres",
        "mysql",
        "database-api"
    ]):

        return {
            "category": "Database Failure",
            "recommended_actions": [
                "Check whether the database server is running.",
                "Verify database connection settings.",
                "Check database connection pool usage.",
                "Inspect database logs for connection failures."
            ]
        }

    # Network problems
    elif any(word in text for word in [
        "timeout",
        "connection refused",
        "network"
    ]):

        return {
            "category": "Network Failure",
            "recommended_actions": [
                "Check network connectivity.",
                "Measure server response times.",
                "Inspect firewall and networking configuration.",
                "Check whether upstream services are overloaded."
            ]
        }

    # Payment problems
    elif any(word in text for word in [
        "payment",
        "gateway",
        "transaction"
    ]):

        return {
            "category": "Payment Service Failure",
            "recommended_actions": [
                "Check payment gateway availability.",
                "Inspect payment API error responses.",
                "Verify payment service configuration.",
                "Check the payment provider's incident status."
            ]
        }

    # Unknown problems
    else:

        return {
            "category": "Unknown Error",
            "recommended_actions": [
                "Inspect the full application logs.",
                "Identify the affected service.",
                "Review recent deployments or configuration changes.",
                "Collect additional diagnostic information."
            ]
        }
# STEP 3: Group similar errors using AI
def group_similar_errors(logs):

    # Find error messages
    errors = [
        log for log in logs
        if "ERROR" in log.upper()
        or "CRITICAL" in log.upper()
    ]

    if not errors:
        return []

    # Handle a single error
        # Remove repeated error patterns before AI processing
    cleaned_errors = [clean_log(log) for log in errors]

    # Keep only unique error messages
    unique_errors = list(dict.fromkeys(cleaned_errors))

    print(f"Total errors: {len(errors)}")
    print(f"Unique error patterns: {len(unique_errors)}")

    # Run AI only on unique error patterns
    if len(unique_errors) == 1:
        unique_labels = [0]

    else:
        embeddings = get_model().encode(
            unique_errors,
            normalize_embeddings=True
        )

        clustering = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=0.20,
            metric="cosine",
            linkage="average"
        )

        unique_labels = clustering.fit_predict(embeddings)

    # Map each unique pattern to its AI incident group
    label_by_message = {
        message: int(label)
        for message, label in zip(unique_errors, unique_labels)
    }

    # STEP 4: Collect related errors
    groups = {}

    for log, cleaned in zip(errors, cleaned_errors):
        label = label_by_message[cleaned]
        groups.setdefault(label, []).append(log)

    # STEP 5: Create incident results
    incidents = []

    for index, messages in enumerate(groups.values(), 1):

        services = set()

        for message in messages:
            service = extract_service(message)

            if service:
                services.add(service)

        incidents.append({
            "incident_id": index,
            "example_error": messages[0],
            "occurrences": len(messages),
            "priority": calculate_priority(messages),
            "affected_services": sorted(services),
            "root_cause": suggest_root_cause(messages),
             "solutions": recommend_solutions(messages),
            "messages": messages,
        })

    return incidents