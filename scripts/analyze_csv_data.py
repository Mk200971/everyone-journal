import requests
import csv
from io import StringIO
import json

# Fetch and analyze the CSV data
def fetch_csv_data(url):
    response = requests.get(url)
    response.raise_for_status()
    return list(csv.DictReader(StringIO(response.text)))

# URLs provided by user
missions_url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/missions_rows-uy9YK8MfW6rD3DDFlwNYFpzk20qewH.csv"
resources_url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/resources_rows-m7ltJZeTLvhY6NavZBwoj34E7zk0IY.csv"

print("Fetching missions data...")
missions = fetch_csv_data(missions_url)
print(f"Found {len(missions)} missions")

print("\nFetching resources data...")
resources = fetch_csv_data(resources_url)
print(f"Found {len(resources)} resources")

print("\n=== MISSIONS ANALYSIS ===")
print("Sample mission:")
print(json.dumps(missions[0], indent=2))

print(f"\nMissions with null resource_id: {sum(1 for m in missions if not m['resource_id'])}")
print(f"Missions with resource_id: {sum(1 for m in missions if m['resource_id'])}")

print("\nMission types:")
mission_types = {}
for mission in missions:
    mission_type = mission.get('type', 'Unknown')
    mission_types[mission_type] = mission_types.get(mission_type, 0) + 1
print(json.dumps(mission_types, indent=2))

print("\n=== RESOURCES ANALYSIS ===")
print("Sample resource:")
print(json.dumps(resources[0], indent=2))

print("\nResource types:")
resource_types = {}
for resource in resources:
    resource_type = resource.get('type', 'Unknown')
    resource_types[resource_type] = resource_types.get(resource_type, 0) + 1
print(json.dumps(resource_types, indent=2))

print("\n=== RELATIONSHIP ANALYSIS ===")
# Create mapping of resource IDs
resource_map = {r['id']: r for r in resources}

print("Missions and their resource relationships:")
for mission in missions[:5]:  # Show first 5 as examples
    resource_id = mission.get('resource_id')
    if resource_id and resource_id in resource_map:
        resource = resource_map[resource_id]
        print(f"✓ Mission: '{mission['title'][:50]}...' -> Resource: '{resource['title'][:50]}...'")
    else:
        print(f"✗ Mission: '{mission['title'][:50]}...' -> No resource linked")

# Suggest resource mappings based on content similarity
print("\n=== SUGGESTED RESOURCE MAPPINGS ===")
customer_obsession_keywords = ['customer', 'obsess', 'experience', 'cx', 'forrester']
unlinked_missions = [m for m in missions if not m.get('resource_id')]

for mission in unlinked_missions[:3]:  # Show first 3 suggestions
    mission_text = (mission['title'] + ' ' + mission['description']).lower()
    
    # Find best matching resource
    best_match = None
    best_score = 0
    
    for resource in resources:
        resource_text = (resource['title'] + ' ' + resource['description']).lower()
        
        # Simple keyword matching score
        score = 0
        for keyword in customer_obsession_keywords:
            if keyword in mission_text and keyword in resource_text:
                score += 2
            elif keyword in resource_text:
                score += 1
        
        if score > best_score:
            best_score = score
            best_match = resource
    
    if best_match:
        print(f"Mission: '{mission['title'][:40]}...'")
        print(f"  -> Suggested Resource: '{best_match['title'][:40]}...' (score: {best_score})")
        print(f"  -> Mission ID: {mission['id']}")
        print(f"  -> Resource ID: {best_match['id']}")
        print()
