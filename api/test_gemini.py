import os
import json
from google import genai
from google.genai import types

def test_gemini():
    # Attempting to use a dummy key to see if the environment mocks Gemini
    client = genai.Client(api_key="mock_key_for_sandbox")
    
    summary_data = {
        "total_spent": 1000,
        "remaining": 4000,
        "total_budget": 5000,
        "percentage_used": 20.0,
        "categories": [
            {"name": "Canteen", "spent": 500, "percentage": 50.0},
            {"name": "Transport", "spent": 300, "percentage": 30.0},
            {"name": "Outings", "spent": 200, "percentage": 20.0}
        ]
    }
    
    prompt = f"""
    You are the spending-insights assistant for CampusSpend.
    
    The financial statistics below have already been calculated and verified by the backend.
    DO NOT recalculate, modify, invent, or contradict any financial number.
    
    Analyze the supplied statistics and provide concise and useful observations.
    Identify:
    1. The highest spending category.
    2. Categories consuming an unusually large percentage of spending.
    3. Whether the user is approaching or exceeding their budget.
    4. Practical ways to reduce unnecessary spending.
    5. One or two useful observations about the spending pattern.
    
    Do not invent transactions, categories, or amounts.
    
    FINANCIAL DATA:
    {json.dumps(summary_data, indent=2)}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        print("Success!")
        print("Response:", response.text)
    except Exception as e:
        print("Exception:", str(e))

if __name__ == "__main__":
    test_gemini()
