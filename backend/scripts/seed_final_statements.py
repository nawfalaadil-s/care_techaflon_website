"""Seed the 25 Final TechaFlon problem statements (idempotent by title)."""

import os
import sys
import uuid
from pathlib import Path

os.environ.setdefault("DEBUG", "false")
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.database.base import SessionLocal

STATEMENTS = [
    ("QuizGenius AI: Your Personalized Learning Challenge Engine", "Adaptive quiz and learning challenge engine", "Develop an adaptive quiz platform that generates personalized questions and learning challenges based on learner performance and knowledge. The system should analyse learner performance, adjust question difficulty in real time, identify knowledge gaps, and recommend personalized learning resources to improve engagement and assessment accuracy.", "easy", None),
    ("GameLearn AI: A Smart Adaptive Learning Adventure", "AI-powered adaptive gamified learning platform", "Develop an adaptive gamified learning platform that personalizes learning paths, challenges, and rewards based on each learner's performance and behaviour. The system should continuously analyse learner progress, engagement, and skill levels to dynamically adjust game difficulty, rewards, and content recommendations.", "easy", None),
    ("FinLearn AI: Intelligent Personal Finance Management and Learning Assistant", "Personalized finance management and learning assistant", "Develop an AI-powered adaptive financial assistant that combines personalized financial management and financial literacy learning by analysing user behaviour, spending patterns, financial goals, and knowledge levels to provide smart budgeting, savings, investment recommendations, and customized learning guidance.", "medium", None),
    ("TaxMate AI: Adaptive Tax Planning and Compliance Assistant", "AI assistant for tax planning and compliance", "Develop an Adaptive Intelligent System that analyses financial transactions, income patterns, and regulatory changes to provide personalized tax planning and compliance recommendations. The solution should use AI and natural language processing to analyse financial records, identify applicable tax benefits, predict obligations, and provide adaptive compliance guidance.", "medium", None),
    ("TrafficIQ AI: Intelligent Mobility Optimization for Smart Cities", "Real-time AI traffic flow optimization", "Develop an adaptive traffic management system that continuously analyzes road conditions and optimizes traffic flow in real time. The solution should collect real-time data from sensors, cameras, and connected devices to optimize traffic signals, detect congestion, and recommend alternate routes.", "medium", None),
    ("Adaptive AI Crop Intelligence for Early Pest and Disease Prevention", "AI-based early crop pest and disease prevention", "Develop an Adaptive Intelligent System for pest and disease management that continuously monitors crop health, predicts potential outbreaks, and dynamically recommends preventive and corrective actions. The system should integrate AI, Machine Learning, Computer Vision, IoT sensors, drones, and predictive analytics to analyse crop images, environmental conditions, and historical data.", "medium", None),
    ("Adaptive Smart Farming Control for Maximum Greenhouse Productivity", "Adaptive AI and IoT greenhouse control", "Develop an Adaptive Intelligent System for smart greenhouse management that continuously monitors environmental conditions, predicts crop requirements, and dynamically controls greenhouse operations. The system should leverage AI, IoT sensors, edge computing, and predictive analytics to monitor temperature, humidity, soil moisture, light intensity, and other environmental parameters.", "medium", None),
    ("AI-Based Smart Learning Resource Logistics", "Predictive logistics for educational resources", "Develop an Industrial AI-powered predictive logistics solution that ensures the availability and timely delivery of educational resources. The system should forecast demand patterns and optimize inventory management across educational institutions by analysing historical usage, student enrollment, academic schedules, and seasonal demand.", "easy", None),
    ("Intelligent Event Logistics for Educational Institutions", "AI-driven logistics planning for educational events", "Create an AI-driven logistics management system that predicts resource requirements and streamlines planning for educational events. The solution should predict participant turnout, transportation needs, equipment demand, and venue utilization to improve planning while minimizing operational costs.", "easy", None),
    ("Predictive Urban Delivery Optimization", "AI-based city delivery demand and route optimization", "Develop an Industrial AI-based urban logistics platform that predicts delivery patterns and generates optimized transportation strategies to reduce congestion and improve efficiency. The system should analyze traffic, weather, demand patterns, and road conditions to generate optimized delivery schedules that reduce travel time and fuel consumption.", "medium", None),
    ("Smart Waste Collection Logistics", "Predictive municipal waste collection routing", "Design an AI-powered predictive waste logistics system that forecasts waste collection requirements and optimizes municipal resource allocation. The solution should use IoT sensor data and historical waste generation patterns to predict collection requirements and allocate vehicles efficiently.", "easy", None),
    ("AI-Based Agricultural Supply Logistics", "Predictive agricultural supply distribution", "Develop an Industrial AI system that predicts demand for seeds, fertilizers, and pesticides and optimizes their distribution to farms. The proposed solution should analyze seasonal crop patterns, weather forecasts, and regional demand to ensure timely delivery and reduce supply shortages.", "easy", None),
    ("Smart Harvest Transportation Prediction", "Predictive harvest transport and scheduling platform", "Build a predictive logistics platform that forecasts harvest volumes and optimizes transportation from farms to storage facilities and markets. The system should predict harvest quantities, vehicle requirements, and optimal delivery schedules to minimize post-harvest waste.", "easy", None),
    ("BloodChain AI: Predictive Blood Supply Management System", "AI-based blood demand and distribution optimization", "Develop an Industrial AI-powered system that predicts blood demand and optimizes blood collection, storage, and distribution across healthcare facilities. The solution should analyse hospital requirements, patient records, blood usage patterns, and regional health trends to optimize inventory levels, reduce wastage, predict shortages, and coordinate timely distribution.", "medium", None),
    ("HealthLogix AI: Predictive Medical Supply and Equipment Logistics Platform", "Predictive healthcare inventory and resource logistics", "Develop an Industrial AI-powered predictive healthcare logistics system that forecasts the demand for medical supplies and critical equipment while optimizing their allocation, inventory management, and distribution across healthcare facilities. The system should use AI, Machine Learning, and predictive analytics to forecast demand and optimize stock management, replenishment, maintenance, and inter-hospital resource transfers.", "medium", None),
    ("Autonomous Peer-Learning Network for Skill Mastery", "Autonomous AI peers for collaborative learning", "Build autonomous AI learning peers that collaborate with students to solve problems and enhance critical thinking. The AI learning peers should have diverse personalities and reasoning styles, discuss concepts, provide feedback, intentionally challenge learners, and co-create educational resources to improve conceptual understanding.", "medium", None),
    ("Adaptive Interactive Narrative Director", "Multi-agent adaptive educational storytelling", "Develop an autonomous multi-agent system that dynamically generates educational storylines, NPC behaviors, and learning challenges based on player interactions and emotions. Autonomous agents should collaboratively analyze player interactions, evaluate learning progress, and dynamically adapt narratives, dialogues, and gameplay in real time.", "medium", None),
    ("Autonomous Municipal Asset Maintenance Operations", "AI agents for predictive city infrastructure maintenance", "Develop an autonomous platform that detects, schedules, and manages urban infrastructure maintenance using AI and IoT. Autonomous AI agents should analyze data from IoT sensors, computer vision systems, and citizen reports to identify issues, prioritize repairs, and efficiently coordinate maintenance operations.", "medium", None),
    ("Autonomous Medical Supply and Pharmacy Management", "Multi-agent hospital inventory management", "Create an autonomous agentic AI system that monitors, predicts, and manages hospital pharmacy and medical inventory operations. AI agents should continuously monitor medicine inventory, predict future demand, identify low-stock situations, coordinate procurement, and optimize distribution while adapting to changing patient volumes, seasonal diseases, and emergency situations.", "medium", None),
    ("Agentic Fraud Ring Detection and Countermeasure Engine", "Autonomous AI fraud investigation and response", "Develop an autonomous fraud detection system that identifies complex fraud networks and initiates dynamic countermeasures. Autonomous investigator agents should analyze transaction networks, identify suspicious fraud patterns, and proactively trigger verification, account protection measures, or forensic reports.", "medium", None),
    ("Student Privacy Protection in E-Learning Platforms", "Secure student data and learning records", "Design a secure platform that protects students' personal information and learning records from cyberattacks and unauthorized access. The platform should encrypt sensitive student data, implement role-based access control, and detect suspicious login attempts to ensure a safe digital learning environment.", "easy", None),
    ("AI-Powered Banking Fraud Detection", "Real-time AI banking fraud detection", "Develop an AI system that detects suspicious banking transactions and prevents financial fraud in real time. Machine learning should analyze customer behavior, transaction patterns, and login activities to identify anomalies, block suspicious transactions, and alert customers.", "easy", None),
    ("Smart CCTV-Based Crime Detection", "Computer vision for suspicious activity detection", "Develop an AI-powered surveillance system that detects suspicious activities and alerts authorities in real time. Computer vision should identify abnormal movements, unattended objects, and restricted-area intrusions, with emergency notifications improving public safety.", "easy", None),
    ("HealthShield AI: Intelligent Healthcare Cyber Threat Detection", "AI-powered healthcare cyber threat detection", "Design an AI-driven cybersecurity platform that continuously monitors hospital networks, connected medical devices, and healthcare applications to detect, predict, and prevent cyber threats in real time. The solution should use Artificial Intelligence, Machine Learning, and anomaly detection to identify suspicious activities and automatically respond to threats.", "medium", None),
    ("SafePath AI – AI Safe Route Planner", "AI navigation using safety and environmental data", "Develop an AI-powered navigation system that recommends the safest travel routes using real-time environmental and public safety data. The system should analyze street lighting, crowd density, crime reports, emergency services, and traffic conditions to recommend the safest routes.", "medium", None),
]

db = SessionLocal()
try:
    existing = {
        row[0]
        for row in db.execute(text("SELECT title FROM problem_statements"))
    }
    added = 0
    for title, summary, description, difficulty, sponsor in STATEMENTS:
        if title in existing:
            print(f"Skipping (already exists): {title[:50]}...")
            continue
        
        # Generate a unique ID
        stmt_id = f"PS-GEN-{str(uuid.uuid4())[:8].upper()}"
        
        db.execute(
            text(
                "INSERT INTO problem_statements"
                " (id, title, summary, description, track, difficulty,"
                "  sponsor, published)"
                " VALUES (:id, :title, :summary, :description, :track,"
                "         :difficulty, :sponsor, false)"
            ),
            {
                "id": stmt_id,
                "title": title,
                "summary": summary,
                "description": description,
                "track": None,
                "difficulty": difficulty,
                "sponsor": sponsor,
            },
        )
        added += 1
        print(f"Added: {title[:50]}...")
    
    db.commit()
    n = db.execute(text("SELECT count(*) FROM problem_statements")).scalar()
    print(f"\n✓ Added {added} new statements")
    print(f"✓ Total problem statements in database: {n}")
    print(f"✓ All statements imported as DRAFTS (published=false)")
except Exception as e:
    print(f"✗ Error: {e}")
    db.rollback()
    raise
finally:
    db.close()
