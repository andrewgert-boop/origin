# ArchSnap Kit

Быстрый **однократный анализ архитектуры** + заготовка для **автоматической системы**.

## Быстрый старт (локально)

```bash
# из корня репозитория
python3 archsnap.py --out archsnap_out
```

Результат:
- `archsnap_out/tree.json` — структура файлов
- `archsnap_out/tree.txt` — дерево в текстовом виде
- `archsnap_out/summary.yaml` — сводка по стеку и инфраструктуре (эвристики)
- `archsnap_out/deps_backend.txt` — Python-зависимости (best-effort)
- `archsnap_out/deps_frontend.txt` — JS-зависимости (best-effort)
- `archsnap_out/files_index.csv` — индекс файлов
- `archsnap_out/arch.md` — человеко-читаемая сводка + Mermaid-схема

**Совет:** передайте `arch.md` и `summary.yaml` в нейросеть для ревью/улучшений.

## Автоматизация (GitHub Actions)

Положите этот репозиторий в корень проекта и добавьте workflow:

`.github/workflows/archsnap.yml` уже создан. Он:
- запускается на `push` и по расписанию (раз в неделю);
- собирает снапшот;
- публикует артефакт в Actions (и опционально коммитит в ветку/папку `docs/archsnap/`).

### Включить авто-коммит (опционально)
Раскомментируйте блок `EndBug/add-and-commit@v9` в `archsnap.yml` и дайте токен (например, `secrets.GITHUB_TOKEN`).

## Параметры

```bash
python3 archsnap.py --path /repo --out archsnap_out
```

## Что дальше

- Для **однократного анализа**: запустите скрипт и отправьте артефакты ИИ.
- Для **системы**: оставьте workflow включённым. Он будет обновлять снимок на каждом пуше и по расписанию.

---

Сделано специально под сценарий Gert.pro: Python-бэкенд, современный фронтенд, Docker/CI. Правьте под себя.
