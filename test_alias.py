"""
Test script to verify alias functionality
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Create database engine and session
DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def upsert_alias(session, politician_id, source, external_id):
    """
    Insert or update a politician alias if it doesn't already exist
    """
    # Check if alias already exists using raw SQL for compatibility
    existing = session.execute(
        text("SELECT id FROM politician_aliases WHERE source = :source AND external_id = :external_id"),
        {"source": source, "external_id": external_id}
    ).fetchone()
    
    if not existing:
        # Insert new alias
        session.execute(
            text("INSERT INTO politician_aliases (politician_id, source, external_id) VALUES (:pid, :src, :ext_id)"),
            {"pid": politician_id, "src": source, "ext_id": external_id}
        )
        session.commit()
        print(f"Added alias for politician {politician_id}: {source}:{external_id}")
    else:
        print(f"Alias already exists for {source}:{external_id}")

def update_photo_url(session, politician_id, bioguide_id):
    """
    Update a politician's photo URL based on their bioguide ID
    """
    if not bioguide_id:
        return
        
    # Construct the photo URL
    photo_url = f"https://www.congress.gov/img/member/{bioguide_id.lower()}.jpg"
    
    # Update the politician record with both photo URL and bioguide ID
    session.execute(
        text("UPDATE politicians SET photo_url = :url, bioguide_id = :bio_id WHERE id = :pid"),
        {"url": photo_url, "bio_id": bioguide_id, "pid": politician_id}
    )
    session.commit()
    print(f"Updated photo URL and bioguide_id for politician {politician_id}")

def test_alias_functionality():
    """Test the alias and photo URL functionality"""
    with SessionLocal() as session:
        # Add some test aliases
        politicians = session.execute(text("SELECT id, first_name, last_name FROM politicians LIMIT 10")).fetchall()
        
        for politician in politicians:
            pid = politician[0]
            name = f"{politician[1]} {politician[2]}".lower().replace(' ', '')
            
            # Add a test bioguide ID
            bioguide_id = f"B000{pid:03d}"
            upsert_alias(session, pid, 'bioguide', bioguide_id)
            
            # Add a test FEC ID
            fec_id = f"FEC{pid:05d}"
            upsert_alias(session, pid, 'fec', fec_id)
            
            # Add a test House Financial Disclosure ID
            house_fd_id = f"HFD{pid:06d}"
            upsert_alias(session, pid, 'house_fd', house_fd_id)
            
            # Update photo URL and bioguide ID
            update_photo_url(session, pid, bioguide_id)
            
            # Update FEC candidate ID
            session.execute(
                text("UPDATE politicians SET fec_candidate_id = :fec_id WHERE id = :pid"),
                {"fec_id": fec_id, "pid": pid}
            )
            session.commit()
            print(f"Updated fec_candidate_id for politician {pid}")
        
        # Verify aliases were added
        aliases = session.execute(text("SELECT * FROM politician_aliases")).fetchall()
        print(f"Total aliases added: {len(aliases)}")
        
        # Verify photo URLs were updated
        updated = session.execute(
            text("SELECT id, first_name, last_name, photo_url FROM politicians WHERE photo_url IS NOT NULL")
        ).fetchall()
        print(f"Total photo URLs updated: {len(updated)}")

if __name__ == "__main__":
    test_alias_functionality()