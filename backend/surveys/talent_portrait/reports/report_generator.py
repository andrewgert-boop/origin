import os
import logging
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from weasyprint import HTML

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_template_dir() -> Path:
    """Возвращает корректный путь к директории с шаблонами"""
    try:
        # Определяем базовый путь: поднимаемся на 4 уровня вверх от текущего файла
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        template_dir = base_dir / "templates" / "talent_portrait"
        
        # Проверяем существование директории
        if not template_dir.exists():
            raise FileNotFoundError(f"Template directory not found: {template_dir}")
        
        logger.info(f"Using template directory: {template_dir}")
        return template_dir
    except Exception as e:
        logger.error(f"Error locating template directory: {str(e)}")
        raise

def generate_html_report(report_data: dict, report_type: str = "respondent") -> str:
    """Генерирует HTML отчет из шаблона"""
    try:
        template_dir = get_template_dir()
        env = Environment(loader=FileSystemLoader(str(template_dir)))
        
        # Определяем имя шаблона на основе типа отчета
        template_name = f"{report_type}_report.html"
        logger.info(f"Loading template: {template_name}")
        
        template = env.get_template(template_name)
        logger.info(f"Rendering template with report data")
        
        return template.render(report=report_data)
    except TemplateNotFound as e:
        logger.error(f"Template not found: {e}")
        raise
    except Exception as e:
        logger.error(f"Error generating HTML report: {str(e)}")
        raise RuntimeError(f"HTML generation failed: {str(e)}")

def generate_pdf_report(html_content: str, output_path: str = None) -> bytes:
    """Генерирует PDF из HTML контента с помощью WeasyPrint"""
    try:
        logger.info("Generating PDF from HTML content")
        
        # Создаем HTML объект из строки
        html = HTML(string=html_content)
        
        if output_path:
            # Сохранение в файл
            logger.info(f"Saving PDF to: {output_path}")
            html.write_pdf(output_path)
            return output_path
        else:
            # Возврат PDF как bytes
            logger.info("Returning PDF as bytes")
            return html.write_pdf()
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        raise RuntimeError(f"PDF generation failed: {str(e)}")

# Функция для тестирования генерации
def test_report_generation():
    """Тестовая функция для проверки генерации отчетов"""
    try:
        # Тестовые данные
        test_data = {
            "business_archetypes": {
                "P": {"score": 32, "percentage": 85.0, "level": "высокий"},
                "A": {"score": 28, "percentage": 75.0, "level": "средний"},
                "E": {"score": 35, "percentage": 92.5, "level": "очень высокий"},
                "I": {"score": 24, "percentage": 60.0, "level": "потенциал"}
            },
            "emotional_intelligence": {
                "awareness": {"score": 15, "percentage": 83.3, "level": "высокий"},
                "management": {"score": 14, "percentage": 77.8, "level": "высокий"},
                "self_motivation": {"score": 12, "percentage": 66.7, "level": "средний"},
                "empathy": {"score": 16, "percentage": 88.9, "level": "высокий"},
                "managing_others": {"score": 13, "percentage": 72.2, "level": "средний"},
                "overall": {"score": 70, "percentage": 77.8, "level": "высокий"}
            }
        }
        
        # Генерация HTML
        html_content = generate_html_report(test_data, "respondent")
        logger.info("HTML report generated successfully")
        
        # Генерация PDF
        pdf_bytes = generate_pdf_report(html_content)
        logger.info(f"PDF generated successfully, size: {len(pdf_bytes)} bytes")
        
        # Сохранение для проверки
        test_output = Path(__file__).parent / "test_report.pdf"
        with open(test_output, "wb") as f:
            f.write(pdf_bytes)
        logger.info(f"Test PDF saved to: {test_output}")
        
        return True
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        return False

if __name__ == "__main__":
    # Запуск теста при прямом выполнении файла
    print("Testing report generation...")
    if test_report_generation():
        print("Test completed successfully!")
    else:
        print("Test failed!")