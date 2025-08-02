
# import packages
import os
from dotenv import load_dotenv
from openai import OpenAI, AuthenticationError
# load .env file
load_dotenv()

# get api key from environment
api_key = os.environ["OPENAI_API_KEY"]

# create OpenAI client
def create_client(api_key):
    try:
        client = OpenAI(api_key=api_key)
        client.models.list()
        return client
    except AuthenticationError:
        print("Incorrect API")
    return None

client = create_client(api_key)
# create embedding
embedding = client.embeddings.create(
    input = "This is an example text that i want to turn into embedding.",
    model = "text-embedding-3-small"
)
print(embedding.data[0].embedding)
#>>>>>>> 65a9591a618da8ad62e490f652ccfe2866ceb1a7





