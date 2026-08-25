"""50-concurrent-user load test for the hackathon platform API.

Simulates a realistic event-day mix against a locally running API:

* 50 virtual users (VUs) registered up-front (unique accounts).
* Every VU loops a read-heavy workload: health, public settings, auth/me,
  and teams/mine, with human-like think times.
* 15 of the VUs are "leaders": they also create a team once, submit a
  project once, and poll their team afterwards.

Usage:
    python scripts/load_test_50.py [BASE_URL] [DURATION_SECONDS]

Requires RATE_LIMIT_ENABLED=false on the server for the steady-state run
(the limiter itself is verified separately by the test suite).
"""

from __future__ import annotations

import asyncio
import json
import random
import statistics
import sys
import time
import uuid
from collections import defaultdict

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8010"
DURATION = int(sys.argv[2]) if len(sys.argv) > 2 else 45
VUS = 50
LEADER_VUS = 15

PASSWORD = "Loadtest!23"
latencies: dict[str, list[float]] = defaultdict(list)
errors: dict[str, int] = defaultdict(int)
status_counts: dict[str, dict[int, int]] = defaultdict(lambda: defaultdict(int))
lock = asyncio.Lock()


def tag() -> str:
    return uuid.uuid4().hex[:8].upper()


def team_payload(email: str) -> dict:
    t = tag()
    return {
        "team_name": f"Load Team {t}",
        "theme": random.choice(["ai-ml", "web"]),
        "leader_name": "Load Leader",
        "leader_email": email,
        "leader_phone": "+91 90000 00000",
        "leader_register_number": f"LT{t}",
        "leader_department": "CSE",
        "leader_year": "3rd Year",
        "members": [
            {
                "name": "Member One",
                "email": f"m1.{t}@loadtest.edu",
                "register_number": f"L1{t}",
                "department": "CSE",
                "year": "3rd Year",
            },
            {
                "name": "Member Two",
                "email": f"m2.{t}@loadtest.edu",
                "register_number": f"L2{t}",
                "department": "AI & DS",
                "year": "2nd Year",
            },
        ],
    }


async def record(client: httpx.AsyncClient, name: str, method: str, url: str, **kw) -> httpx.Response:
    start = time.perf_counter()
    try:
        response = await client.request(method, url, **kw)
        elapsed_ms = (time.perf_counter() - start) * 1000
        async with lock:
            latencies[name].append(elapsed_ms)
            status_counts[name][response.status_code] += 1
            if response.status_code >= 500:
                errors[f"{name}:5xx"] += 1
        return response
    except Exception as exc:  # noqa: BLE001
        async with lock:
            errors[f"{name}:{type(exc).__name__}"] += 1
        raise


async def setup_vu(client: httpx.AsyncClient, index: int) -> tuple[dict, bool]:
    """Register one account; returns (headers, is_leader)."""
    email = f"vu{index}.{uuid.uuid4().hex[:8]}@loadtest.edu"
    await asyncio.sleep(random.uniform(0, 6))  # stagger registrations
    response = await record(
        client, "auth/register", "POST",
        f"{BASE}/api/auth/register",
        json={"email": email, "full_name": f"VU {index}", "password": PASSWORD},
    )
    if response.status_code != 201:
        # Account may already exist from an earlier run — try login instead.
        response = await record(
            client, "auth/login(setup)", "POST",
            f"{BASE}/api/auth/login",
            json={"email": email, "password": PASSWORD},
        )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, index < LEADER_VUS


async def leader_flow(client: httpx.AsyncClient, headers: dict) -> None:
    email = f"leader.{uuid.uuid4().hex[:8]}@loadtest.edu"
    response = await record(
        client, "teams/create", "POST", f"{BASE}/api/teams",
        json=team_payload(email), headers=headers,
    )
    if response.status_code != 201:
        return
    team_id = response.json()["id"]
    await record(client, "teams/mine", "GET", f"{BASE}/api/teams/mine", headers=headers)
    await record(
        client, "submission/put", "PUT",
        f"{BASE}/api/teams/{team_id}/submission",
        headers=headers,
        json={
            "project_name": f"Load Project {tag()}",
            "description": "A load-test submission with a sufficiently long description.",
            "repo_url": "https://github.com/example/load-test",
        },
    )


async def worker(client: httpx.AsyncClient, index: int, deadline: float, setup_sem: asyncio.Semaphore) -> None:
    async with setup_sem:
        headers, is_leader_setup = await setup_vu(client, index)

    if is_leader_setup:
        await leader_flow(client, headers)

    while time.perf_counter() < deadline:
        await record(client, "health", "GET", f"{BASE}/api/health")
        await asyncio.sleep(random.uniform(0.05, 0.2))

        await record(client, "settings/public", "GET", f"{BASE}/api/settings/public")
        await asyncio.sleep(random.uniform(0.05, 0.2))

        await record(client, "auth/me", "GET", f"{BASE}/api/auth/me", headers=headers)
        await asyncio.sleep(random.uniform(0.05, 0.2))

        if index % 3 == 0:
            await record(client, "teams/mine", "GET", f"{BASE}/api/teams/mine", headers=headers)
        await asyncio.sleep(random.uniform(0.1, 0.4))


def report() -> None:
    print(f"\n{'endpoint':<22} {'reqs':>6} {'p50ms':>8} {'p95ms':>8} {'p99ms':>8} {'maxms':>8}  status-codes")
    print("-" * 100)
    total = 0
    for name in sorted(latencies):
        values = sorted(latencies[name])
        total += len(values)
        codes = ", ".join(f"{c}:{n}" for c, n in sorted(status_counts[name].items()))
        print(
            f"{name:<22} {len(values):>6} "
            f"{statistics.median(values):>8.0f} "
            f"{values[int(len(values)*0.95)-1]:>8.0f} "
            f"{values[int(len(values)*0.99)-1]:>8.0f} "
            f"{values[-1]:>8.0f}  {codes}"
        )
    print("-" * 100)
    print(f"total requests: {total}")
    if errors:
        print("errors:", json.dumps(dict(errors), indent=2))
    else:
        print("errors: none")


async def main() -> None:
    limits = httpx.Limits(max_connections=120, max_keepalive_connections=60)
    timeout = httpx.Timeout(60.0, connect=15.0)
    # Limit concurrent setup registrations so the DB pool (default 5) is not overwhelmed.
    setup_sem = asyncio.Semaphore(5)
    async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
        health = await client.get(f"{BASE}/api/health")
        assert health.status_code == 200, f"server not healthy: {health.text}"

        print(f"warming up {VUS} virtual users against {BASE} ...")
        deadline = time.perf_counter() + DURATION
        start = time.perf_counter()
        await asyncio.gather(*(worker(client, i, deadline, setup_sem) for i in range(VUS)))
        elapsed = time.perf_counter() - start

        report()
        rps = sum(len(v) for v in latencies.values()) / elapsed
        print(f"\nduration: {elapsed:.1f}s  |  throughput: {rps:.1f} req/s")

        five_xx = sum(v for k, v in errors.items() if ":5xx" in k or "Error" in k)
        print("RESULT:", "PASS" if five_xx == 0 else "FAIL")


if __name__ == "__main__":
    asyncio.run(main())
