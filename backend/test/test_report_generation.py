# tests/test_report_generation.py
from surveys.talent_portrait.reports.report_generator import generate_html_report, generate_pdf_report

def test_report_generation():
    """Тест генерации отчетов"""
    sample_data = {
        "business_archetypes": {
            "P": {"score": 42, "percentage": 89.5, "level": "высокий"},
            "A": {"score": 18, "percentage": 37.5, "level": "низкий"},
            "E": {"score": 30, "percentage": 68.4, "level": "высокий"},
            "I": {"score": 24, "percentage": 50.0, "level": "средний"}
        },
        # ... другие данные отчета
    }
    
    # Тест HTML генерации
    html_report = generate_html_report(sample_data, "respondent")
    assert "<html" in html_report
    assert "бизнес-архетипы" in html_report
    
    # Тест PDF генерации
    pdf_bytes = generate_pdf_report(html_report)
    assert pdf_bytes.startswith(b'%PDF')
    
    # Тест сохранения в файл
    output_path = "/tmp/test_report.pdf"
    result_path = generate_pdf_report(html_report, output_path)
    assert result_path == output_path
    assert os.path.exists(output_path)
    assert os.path.getsize(output_path) > 1024