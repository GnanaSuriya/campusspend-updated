import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load env vars
load_dotenv()

app = Flask(__name__)
# Vercel serverless functions handle CORS differently sometimes, but this is safe
CORS(app, resources={r"/api/*": {"origins": "*"}})

startup_error = None
try:
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    from database import db, migrate
    from routes.auth import auth_bp
    from routes.transactions import transactions_bp
    from routes.budgets import budgets_bp
    from routes.groups import groups_bp
    from routes.insights import insights_bp
    from routes.direct_shared import direct_shared_bp
except Exception as e:
    import traceback
    startup_error = traceback.format_exc()

# Configure Database
db_url = os.environ.get('DATABASE_URL', '').strip().strip('"').strip("'")
if not db_url:
    db_url = 'sqlite:///local.db'

if db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)
if db_url.startswith('postgresql://'):
    db_url = db_url.replace('postgresql://', 'postgresql+pg8000://', 1)

try:
    if not startup_error:
        app.config['SQLALCHEMY_DATABASE_URI'] = db_url
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

        db.init_app(app)
        migrate.init_app(app, db)

        with app.app_context():
            db.create_all()

        # Register Blueprints
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
        app.register_blueprint(budgets_bp, url_prefix='/api/budgets')
        app.register_blueprint(groups_bp, url_prefix='/api')
        app.register_blueprint(insights_bp, url_prefix='/api')
        app.register_blueprint(direct_shared_bp, url_prefix='/api/shared')
except Exception as e:
    import traceback
    startup_error = startup_error or traceback.format_exc()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    if startup_error:
        return jsonify({"success": False, "error": f"Startup Error: {startup_error}"}), 500
    return jsonify({"success": False, "error": "Not Found"}), 404

# For local development
if __name__ == '__main__':
    app.run(debug=True, port=5000)
