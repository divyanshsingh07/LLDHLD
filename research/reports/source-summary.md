# Research Source Summary

Generated: 2026-10-02T05:13:58.327Z

## Pipeline overview

Public sources → fetch/cache → parse → normalize → deduplicate → classify → validate → synthesize → unified roadmap.

## Sources discovered

- Registry entries: **32**
- Successfully fetched: **32**
- Failed / rejected: **0**

## Sources used

- **roadmap.sh Official Roadmap Catalog** (`roadmapsh-catalog`) — https://roadmap.sh/api/v1-list-official-roadmaps — license: proprietary-restricted
- **roadmap.sh backend** (`roadmapsh-backend`) — https://roadmap.sh/backend — license: proprietary-restricted
- **roadmap.sh backend-beginner** (`roadmapsh-backend-beginner`) — https://roadmap.sh/backend-beginner — license: proprietary-restricted
- **roadmap.sh full-stack** (`roadmapsh-full-stack`) — https://roadmap.sh/full-stack — license: proprietary-restricted
- **roadmap.sh devops** (`roadmapsh-devops`) — https://roadmap.sh/devops — license: proprietary-restricted
- **roadmap.sh devops-beginner** (`roadmapsh-devops-beginner`) — https://roadmap.sh/devops-beginner — license: proprietary-restricted
- **roadmap.sh system-design** (`roadmapsh-system-design`) — https://roadmap.sh/system-design — license: proprietary-restricted
- **roadmap.sh software-architect** (`roadmapsh-software-architect`) — https://roadmap.sh/software-architect — license: proprietary-restricted
- **roadmap.sh software-design-architecture** (`roadmapsh-software-design-architecture`) — https://roadmap.sh/software-design-architecture — license: proprietary-restricted
- **roadmap.sh api-design** (`roadmapsh-api-design`) — https://roadmap.sh/api-design — license: proprietary-restricted
- **roadmap.sh computer-science** (`roadmapsh-computer-science`) — https://roadmap.sh/computer-science — license: proprietary-restricted
- **roadmap.sh linux** (`roadmapsh-linux`) — https://roadmap.sh/linux — license: proprietary-restricted
- **roadmap.sh docker** (`roadmapsh-docker`) — https://roadmap.sh/docker — license: proprietary-restricted
- **roadmap.sh kubernetes** (`roadmapsh-kubernetes`) — https://roadmap.sh/kubernetes — license: proprietary-restricted
- **roadmap.sh aws** (`roadmapsh-aws`) — https://roadmap.sh/aws — license: proprietary-restricted
- **roadmap.sh terraform** (`roadmapsh-terraform`) — https://roadmap.sh/terraform — license: proprietary-restricted
- **roadmap.sh redis** (`roadmapsh-redis`) — https://roadmap.sh/redis — license: proprietary-restricted
- **roadmap.sh postgresql-dba** (`roadmapsh-postgresql-dba`) — https://roadmap.sh/postgresql-dba — license: proprietary-restricted
- **roadmap.sh sql** (`roadmapsh-sql`) — https://roadmap.sh/sql — license: proprietary-restricted
- **roadmap.sh git-github** (`roadmapsh-git-github`) — https://roadmap.sh/git-github — license: proprietary-restricted
- **roadmap.sh datastructures-and-algorithms** (`roadmapsh-datastructures-and-algorithms`) — https://roadmap.sh/datastructures-and-algorithms — license: proprietary-restricted
- **roadmap.sh cyber-security** (`roadmapsh-cyber-security`) — https://roadmap.sh/cyber-security — license: proprietary-restricted
- **roadmap.sh code-review** (`roadmapsh-code-review`) — https://roadmap.sh/code-review — license: proprietary-restricted
- **Donne Martin System Design Primer** (`system-design-primer`) — https://raw.githubusercontent.com/donnemartin/system-design-primer/master/README.md — license: CC-BY-4.0
- **AWS Well-Architected Framework** (`aws-well-architected`) — https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html — license: amazon-docs
- **Google SRE Book (public chapters)** (`google-sre-book`) — https://sre.google/sre-book/table-of-contents/ — license: CC-BY-NC-ND-4.0
- **Kubernetes Official Documentation** (`kubernetes-docs`) — https://kubernetes.io/docs/home/ — license: CC-BY-4.0
- **Docker Official Documentation** (`docker-docs`) — https://docs.docker.com/get-started/ — license: apache-2.0-docs
- **OpenTelemetry Documentation** (`opentelemetry-docs`) — https://opentelemetry.io/docs/ — license: CC-BY-4.0
- **CNCF Landscape** (`cncf-landscape`) — https://landscape.cncf.io/api/items — license: apache-2.0
- **PostgreSQL Documentation** (`postgresql-docs`) — https://www.postgresql.org/docs/current/ — license: postgresql
- **Redis Documentation** (`redis-docs`) — https://redis.io/docs/latest/ — license: redis-docs

## Sources rejected

_none_

### Rejection policy notes

- roadmap.sh content is **proprietary/restricted**: used for **concept discovery & ordering only**. Product descriptions are original synthesis; copyrighted body text is not republished.
- Search engine result pages are **not** scraped as knowledge. Queries are recorded for discovery extensibility only.
- Failed HTTP fetches are skipped; fallback to other official docs / GitHub raw sources.

## Concept statistics

| Metric | Count |
| --- | ---: |
| Observed concept mentions collected | 2721 |
| Canonical concepts after normalization | 186 |
| Duplicate groups merged | 80 |
| Optional library concepts added | 29 |
| Final roadmap nodes | 186 |
| CORE | 70 |
| SUPPORTING | 60 |
| OPTIONAL | 38 |
| SPECIALIZATION | 18 |
| Graph edges | 300 |
| Spine nodes | 34 |

## Major learning stages (recommended spine)

1. **Foundations** — domains: FOUNDATIONS, PROGRAMMING, COMPUTER_SCIENCE
2. **Networking** — domains: NETWORKING
3. **Backend** — domains: BACKEND, API_DESIGN
4. **Databases** — domains: DATABASES
5. **Software Architecture** — domains: SOFTWARE_ARCHITECTURE
6. **DevOps** — domains: DEVOPS, CONTAINERS, INFRASTRUCTURE
7. **Cloud** — domains: CLOUD, ORCHESTRATION
8. **Distributed Systems** — domains: DISTRIBUTED_SYSTEMS
9. **Reliability** — domains: RELIABILITY, OBSERVABILITY, SECURITY
10. **Advanced System Design** — domains: SYSTEM_DESIGN, PERFORMANCE, ADVANCED_ARCHITECTURE

Spine node IDs:

1. `internet-fundamentals`
2. `version-control-git`
3. `linux-cli`
4. `programming-fundamentals`
5. `data-structures`
6. `algorithms-complexity`
7. `os-fundamentals`
8. `networking-fundamentals`
9. `dns`
10. `http-fundamentals`
11. `tls-https`
12. `api-fundamentals`
13. `rest-api-design`
14. `authentication`
15. `backend-services`
16. `sql-fundamentals`
17. `relational-databases`
18. `caching-fundamentals`
19. `clean-code-principles`
20. `architectural-styles`
21. `load-balancing`
22. `messaging-queues`
23. `ci-cd`
24. `containerization`
25. `infrastructure-as-code`
26. `cloud-fundamentals`
27. `kubernetes-fundamentals`
28. `system-design-intro`
29. `scalability-metrics`
30. `cap-consistency`
31. `observability-fundamentals`
32. `security-fundamentals`
33. `capacity-estimation`
34. `real-world-design-practice`

## Major conflicts / positioning decisions

- **Redis timing**: treated as an implementation of *Distributed Caching* after *Caching Fundamentals*, not an early beginner language topic.
- **Microservices vs monolith**: Modular Monolith precedes Microservices; microservices are not framed as universally correct.
- **HTTP vs HTTP/2/3**: kept distinct — fundamentals vs protocol evolution.
- **Caching family**: Caching Fundamentals, Cache Strategies, Cache Invalidation, and Distributed Caching remain separate nodes.
- **Docker vs containerization**: conceptual containerization is core; Docker is the primary implementation technology.

## Validation

- Status: **PASSED**
- Errors: 0
- Warnings: 46

## Refresh commands

```bash
npm run research
npm run normalize
npm run validate-roadmap
npm run build-roadmap
npm run check-links
```

## Notes on originality

Descriptions, learning rationales, and project prompts are synthesized. Sources contribute discovery, consensus scoring, ordering signals, and attribution URLs.
