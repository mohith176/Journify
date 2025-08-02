from pymongo import MongoClient
from datetime import datetime
import json
from bson import ObjectId

# MongoDB connection with the provided URI
MONGO_URI = "mongodb+srv://saikrishnamohith6:oNG2mMF24K1nFJjd@cluster0.3ppet.mongodb.net/journify?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client['journify']  # Using the database name from the URI
collection = db['moodtrackings']

# Verify connection
try:
    client.admin.command('ismaster')
    print("MongoDB Connected:", client.address[0])
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
    exit(1)

# Mood tracking data
mood_data = [
  {
    "user": "67d525f05e4a01632d564497",
    "date": "2025-02-15T18:30:00.000+00:00",
    "moods": [
      { "mood": "Good", "time": "2025-02-15T10:15:32.463+00:00" },
      { "mood": "Neutral", "time": "2025-02-15T14:45:19.763+00:00" },
      { "mood": "Great", "time": "2025-02-15T20:12:45.134+00:00" }
    ],
    "dailyAverage": { "mood": "Good", "intensity": 4 },
    "notes": ""
  },
  {
    "user": "67d525f05e4a01632d564497",
    "date": "2025-02-18T18:30:00.000+00:00",
    "moods": [
      { "mood": "Neutral", "time": "2025-02-18T09:10:00.251+00:00" },
      { "mood": "Sad", "time": "2025-02-18T12:30:45.854+00:00" }
    ],
    "dailyAverage": { "mood": "Neutral", "intensity": 3 },
    "notes": "Felt a little low in the afternoon."
  },
  {
    "user": "67d525f05e4a01632d564497",
    "date": "2025-02-21T18:30:00.000+00:00",
    "moods": [
      { "mood": "Great", "time": "2025-02-21T08:05:32.124+00:00" },
      { "mood": "Good", "time": "2025-02-21T16:30:50.421+00:00" }
    ],
    "dailyAverage": { "mood": "Good", "intensity": 4 },
    "notes": "Productive day!"
  },
  {
    "user": "67d525f05e4a01632d564497",
    "date": "2025-02-24T18:30:00.000+00:00",
    "moods": [
      { "mood": "Horrible", "time": "2025-02-24T07:00:00.684+00:00" },
      { "mood": "Sad", "time": "2025-02-24T15:45:10.214+00:00" }
    ],
    "dailyAverage": { "mood": "Sad", "intensity": 2 },
    "notes": "Not a great day, felt drained."
  },
  {
    "user": "67d525f05e4a01632d564497",
    "date": "2025-02-27T18:30:00.000+00:00",
    "moods": [
      { "mood": "Neutral", "time": "2025-02-27T10:00:45.124+00:00" },
      { "mood": "Good", "time": "2025-02-27T18:20:55.684+00:00" }
    ],
    "dailyAverage": { "mood": "Neutral", "intensity": 3 },
    "notes": "Nothing much, a normal day."
  },
  {
    "user": "67d525f05e4a01632d564497",
    "date": "2025-03-01T18:30:00.000+00:00",
    "moods": [
      { "mood": "Sad", "time": "2025-03-01T08:45:10.354+00:00" },
      { "mood": "Neutral", "time": "2025-03-01T13:15:45.687+00:00" },
      { "mood": "Good", "time": "2025-03-01T19:40:30.874+00:00" }
    ],
    "dailyAverage": { "mood": "Neutral", "intensity": 3 },
    "notes": "Started sad, but improved later."
  },
  {
    "user": "67d525f05e4a01632d564497",
    "date": "2025-03-04T18:30:00.000+00:00",
    "moods": [
      { "mood": "Great", "time": "2025-03-04T09:30:25.214+00:00" }
    ],
    "dailyAverage": { "mood": "Great", "intensity": 5 },
    "notes": "Had an amazing day!"
  },
  {
    "user": "67d525f05e4a01632d564497",
    "date": "2025-03-07T18:30:00.000+00:00",
    "moods": [
      { "mood": "Neutral", "time": "2025-03-07T11:00:00.684+00:00" },
      { "mood": "Sad", "time": "2025-03-07T16:45:10.214+00:00" }
    ],
    "dailyAverage": { "mood": "Sad", "intensity": 2 },
    "notes": "Bit of a low energy day."
  },
  {
    "user": "67d525f05e4a01632d564497",
    "date": "2025-03-10T18:30:00.000+00:00",
    "moods": [
      { "mood": "Horrible", "time": "2025-03-10T07:30:25.214+00:00" },
      { "mood": "Sad", "time": "2025-03-10T12:10:50.684+00:00" },
      { "mood": "Neutral", "time": "2025-03-10T20:00:45.874+00:00" }
    ],
    "dailyAverage": { "mood": "Sad", "intensity": 2 },
    "notes": "Rough start, but ended okay."
  },
  {
    "user": "67d525f05e4a01632d564497",
    "date": "2025-03-13T18:30:00.000+00:00",
    "moods": [
      { "mood": "Good", "time": "2025-03-13T09:30:25.214+00:00" },
      { "mood": "Great", "time": "2025-03-13T15:00:50.684+00:00" }
    ],
    "dailyAverage": { "mood": "Good", "intensity": 4 },
    "notes": "Felt very motivated!"
  }
]

# Process data to convert string timestamps to datetime objects and string ObjectIds to actual ObjectIds
for entry in mood_data:
    # Convert string ObjectId to ObjectId
    entry["user"] = ObjectId(entry["user"])
    
    # Convert date string to datetime
    entry["date"] = datetime.fromisoformat(entry["date"].replace("Z", "+00:00"))
    
    # Convert mood time strings to datetime
    for mood in entry["moods"]:
        mood["time"] = datetime.fromisoformat(mood["time"].replace("Z", "+00:00"))

# Check if the data already exists to avoid duplicates
existing_check = collection.find_one({
    "user": ObjectId("67d525f05e4a01632d564497"),
    "date": datetime.fromisoformat("2025-02-15T18:30:00.000+00:00")
})

if existing_check:
    print("Warning: Some of this data may already exist in the database.")
    proceed = input("Do you want to proceed with insertion anyway? (y/n): ")
    if proceed.lower() != 'y':
        print("Insertion cancelled.")
        client.close()
        exit(0)

# Insert data into MongoDB
try:
    result = collection.insert_many(mood_data)
    print(f"Successfully inserted {len(result.inserted_ids)} documents")
    print(f"First few inserted IDs: {result.inserted_ids[:3]}...")
except Exception as e:
    print(f"Error inserting data: {e}")

# Close the connection
client.close()
print("Connection closed")