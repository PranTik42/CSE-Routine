# CSE Routine

A free, static university routine web app. Upload a new `routine.pdf` to the repository and GitHub Actions parses it and redeploys the site.

## Local test

```bash
pip install -r requirements.txt
python parser/parse_routine.py routine.pdf docs/data.json
python -m http.server 8000 -d docs
```

Open http://localhost:8000
