# Public release checklist

## Secrets and local data

- Confirm `.env` is ignored and not tracked.
- Confirm `specs/` and local product-plan files are ignored and not tracked.
- Confirm `backups/`, database dumps and private keys are not tracked.
- Do not publish `docker compose config` output because it expands `env_file`.
- Search for organization names, private URLs, emails, usernames and tokens.
- Review screenshots for ticket titles, repository names and personal notes.

## Repository content

- Run `git status --short` and review every file intended for the first commit.
- Run `git ls-files` after staging and confirm no local-only files are present.
- Confirm examples use fictitious projects, repositories and domains.
- Confirm the README describes token permissions and query configuration.
- Choose and add a license before announcing the project as open source.

## Validation

```bash
npm run check
docker compose exec -T dashboard npm run check
npm audit
git diff --check
```

Confirm only `127.0.0.1:5174` is published by Docker Compose.
