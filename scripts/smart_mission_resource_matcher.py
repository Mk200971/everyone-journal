import requests
import csv
from io import StringIO
import json
from difflib import SequenceMatcher

def similarity(a, b):
    """Calculate similarity between two strings"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def fetch_csv_data(url):
    response = requests.get(url)
    response.raise_for_status()
    return list(csv.DictReader(StringIO(response.text)))

# URLs provided by user
missions_url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/missions_rows-uy9YK8MfW6rD3DDFlwNYFpzk20qewH.csv"
resources_url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/resources_rows-m7ltJZeTLvhY6NavZBwoj34E7zk0IY.csv"

print("Fetching data...")
missions = fetch_csv_data(missions_url)
resources = fetch_csv_data(resources_url)

print(f"Found {len(missions)} missions and {len(resources)} resources")

# Create smart matching based on content similarity
matches = []
unmatched_missions = []

print("\n=== SMART MATCHING ANALYSIS ===")

for mission in missions:
    mission_text = f"{mission['title']} {mission['description']}".lower()
    
    best_match = None
    best_score = 0
    
    for resource in resources:
        resource_text = f"{resource['title']} {resource['description']}".lower()
        
        # Calculate multiple similarity scores
        title_similarity = similarity(mission['title'], resource['title'])
        desc_similarity = similarity(mission['description'], resource['description'])
        combined_similarity = similarity(mission_text, resource_text)
        
        # Keyword matching for customer obsession themes
        customer_keywords = ['customer', 'obsess', 'experience', 'cx', 'forrester', 'behavior', 'culture', 'focus']
        keyword_score = 0
        
        for keyword in customer_keywords:
            if keyword in mission_text and keyword in resource_text:
                keyword_score += 2
            elif keyword in resource_text and any(k in mission_text for k in customer_keywords):
                keyword_score += 1
        
        # Combined scoring (weighted)
        total_score = (
            title_similarity * 0.4 +
            desc_similarity * 0.3 +
            combined_similarity * 0.2 +
            min(keyword_score / 10, 0.1)  # Cap keyword bonus at 0.1
        )
        
        if total_score > best_score and total_score > 0.2:  # Minimum threshold
            best_score = total_score
            best_match = resource
    
    if best_match:
        matches.append({
            'mission_id': mission['id'],
            'mission_title': mission['title'],
            'resource_id': best_match['id'],
            'resource_title': best_match['title'],
            'score': best_score
        })
        print(f"✓ '{mission['title'][:40]}...' -> '{best_match['title'][:40]}...' (score: {best_score:.3f})")
    else:
        unmatched_missions.append(mission)
        print(f"✗ '{mission['title'][:40]}...' -> No good match found")

print(f"\n=== MATCHING RESULTS ===")
print(f"Successfully matched: {len(matches)} missions")
print(f"Unmatched missions: {len(unmatched_missions)}")

# Generate SQL update statements
print(f"\n=== GENERATED SQL UPDATES ===")
sql_statements = []

for match in matches:
    sql = f"UPDATE missions SET resource_id = '{match['resource_id']}' WHERE id = '{match['mission_id']}';"
    sql_statements.append(sql)
    print(f"-- Match: {match['mission_title'][:30]}... -> {match['resource_title'][:30]}...")
    print(sql)

# Save SQL to a file for execution
with open('/tmp/mission_resource_updates.sql', 'w') as f:
    f.write("-- Smart Mission-Resource Matching Updates\n")
    f.write("-- Generated based on content similarity analysis\n\n")
    for i, match in enumerate(matches):
        f.write(f"-- Match {i+1}: {match['mission_title']} -> {match['resource_title']}\n")
        f.write(f"UPDATE missions SET resource_id = '{match['resource_id']}' WHERE id = '{match['mission_id']}';\n\n")

print(f"\nSQL statements saved to /tmp/mission_resource_updates.sql")
print("Ready to execute the updates!")
