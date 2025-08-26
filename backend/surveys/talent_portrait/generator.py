from fastapi.templating import Jinja2Templates
from pathlib import Path
import pdfkit

BASE_DIR = Path(__file__).resolve().parent.parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates/talent_portrait"))

def generate_html_report(report_data: dict, report_type: str = "respondent"):
    template_name = "respondent_report.html" if report_type == "respondent" else "client_report.html"
    
    return templates.TemplateResponse(
        template_name,
        {"request": None, "report": report_data}
    )

def generate_pdf_report(html_content: str, output_path: str):
    config = pdfkit.configuration(wkhtmltopdf='/usr/bin/wkhtmltopdf')
    pdfkit.from_string(html_content, output_path, configuration=config)
    return output_path