"""Start the site locally: python run.py  (then open http://127.0.0.1:5000)"""

from dotenv import load_dotenv

load_dotenv()

from app import create_app  # noqa: E402  (load .env before reading config)

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
