"""Offline syntax check only. Does NOT execute PostgreSQL or prove RLS behavior.

Install the parser outside application dependencies:
  python -m pip install --target tmp/sql-parser pglast==8.5
  python scripts/check-sql.py
"""
from pathlib import Path
import re
import sys
import tomllib

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "tmp" / "sql-parser"))
try:
    from pglast import parse_sql
except ImportError:
    sys.exit("Missing optional pglast parser. See this script's install instructions.")

config = tomllib.loads((root / "supabase/config.toml").read_text(encoding="utf-8-sig"))
assert config["api"]["schemas"] == ["public"]
assert config["api"]["auto_expose_new_tables"] is False
assert config["auth"]["email"]["enable_confirmations"] is True
print("Local TOML parses; public-only API and confirmed email settings checked.")
paths = [*sorted((root / "supabase/migrations").glob("*.sql")), root / "supabase/seed.sql", *sorted((root / "supabase/tests").glob("*.sql"))]
for file in paths:
    sql = file.read_text(encoding="utf-8-sig")
    statements = parse_sql(sql)
    embedded = re.findall(r"\$\$(.*?)\$\$", sql, re.S) if file.parent.name == "tests" else []
    for query in embedded:
        parse_sql(query)
    print(f"{file.relative_to(root)}: {len(statements)} statements, {len(embedded)} embedded test queries; syntax OK")
print("Syntax only. Run Supabase migration, database lint, and pgTAP tests on a working local database.")
