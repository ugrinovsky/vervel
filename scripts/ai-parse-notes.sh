#!/usr/bin/env bash
# Разбор текста тренировки через API (как в форме): логин + POST /ai/parse-notes-text.
#
#   export AI_TEST_EMAIL='you@example.com'
#   export AI_TEST_PASSWORD='secret'
#   bash scripts/ai-parse-notes.sh "…"    # всегда работает
#   chmod +x scripts/ai-parse-notes.sh    # один раз, потом ./
#   ./scripts/ai-parse-notes.sh "Румынская тяга
#   3x10 60кг"
#
# Или из файла:
#   ./scripts/ai-parse-notes.sh < program.txt
#
# База API (по умолчанию локальный Adonis):
#   BASE_URL=http://127.0.0.1:3333 ./scripts/ai-parse-notes.sh "Жим 3x8"

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3333}"

if [[ -z "${AI_TEST_EMAIL:-}" || -z "${AI_TEST_PASSWORD:-}" ]]; then
  echo "Задайте переменные: AI_TEST_EMAIL и AI_TEST_PASSWORD" >&2
  exit 1
fi

if [[ $# -gt 0 ]]; then
  NOTES=$(printf '%s\n' "$*")
else
  NOTES=$(cat)
fi

NOTES_TRIMMED="${NOTES#"${NOTES%%[![:space:]]*}"}"
NOTES_TRIMMED="${NOTES_TRIMMED%"${NOTES_TRIMMED##*[![:space:]]}"}"
if [[ ${#NOTES_TRIMMED} -lt 5 ]]; then
  echo "Текст не короче 5 символов (требование API)." >&2
  exit 1
fi
NOTES="$NOTES_TRIMMED"

COOKIE_JAR="$(mktemp -t vervel-ai-cookies)"
LOGIN_BODY="$(mktemp -t vervel-login)"
cleanup() { rm -f "$COOKIE_JAR" "$LOGIN_BODY"; }
trap cleanup EXIT

# В bash только префикс ВПЕРЕДИ команды задаёт env для процесса; после node это были бы лишние argv.
LOGIN_JSON="$(
  E="$AI_TEST_EMAIL" P="$AI_TEST_PASSWORD" node -e \
    "console.log(JSON.stringify({ email: process.env.E, password: process.env.P }))"
)"

if [[ "$LOGIN_JSON" == "{}" ]]; then
  echo "Логин-JSON пустой {} — process.env не видит E/P (node не в PATH или сломан вызов)." >&2
  exit 1
fi

set +e
# --json (curl ≥ 7.82) гарантирует Content-Type: application/json
if curl --help 2>&1 | grep -q -- '--json'; then
  HTTP_CODE="$(
    curl -sS -o "$LOGIN_BODY" -w '%{http_code}' -c "$COOKIE_JAR" -X POST "$BASE_URL/login" \
      --json "$LOGIN_JSON"
  )"
else
  HTTP_CODE="$(
    curl -sS -o "$LOGIN_BODY" -w '%{http_code}' -c "$COOKIE_JAR" -X POST "$BASE_URL/login" \
      -H 'Content-Type: application/json' \
      -d "$LOGIN_JSON"
  )"
fi
CURL_EXIT=$?
set -e

if [[ "$CURL_EXIT" -ne 0 ]]; then
  echo "curl: не удалось соединиться с $BASE_URL (код выхода $CURL_EXIT)." >&2
  echo "Запущен ли API: cd apps/api && node ace serve" >&2
  exit 1
fi

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "POST $BASE_URL/login → HTTP $HTTP_CODE" >&2
  [[ -s "$LOGIN_BODY" ]] && cat "$LOGIN_BODY" >&2 && echo >&2
  case "$HTTP_CODE" in
    401)
      echo "Неверный email/пароль или аккаунт только через соцсеть." >&2
      ;;
    429)
      echo "Лимит попыток входа с этого IP — подожди или смени сеть." >&2
      ;;
    400)
      echo "Запрос отклонён: тело не JSON или нет email/password — см. сообщение выше." >&2
      ;;
    500 | 502 | 503)
      echo "Ошибка сервера: смотри терминал с node ace serve и логи; часто это БД или .env." >&2
      ;;
    *)
      echo "Проверь BASE_URL (сейчас $BASE_URL)." >&2
      ;;
  esac
  exit 1
fi

NOTES_JSON="$(NOTES="$NOTES" node -e "console.log(JSON.stringify({ notes: process.env.NOTES }))")"

if command -v jq >/dev/null 2>&1; then
  curl -sS -b "$COOKIE_JAR" -X POST "$BASE_URL/ai/parse-notes-text" \
    -H 'Content-Type: application/json' \
    -d "$NOTES_JSON" | jq .
else
  curl -sS -b "$COOKIE_JAR" -X POST "$BASE_URL/ai/parse-notes-text" \
    -H 'Content-Type: application/json' \
    -d "$NOTES_JSON"
  echo
fi
