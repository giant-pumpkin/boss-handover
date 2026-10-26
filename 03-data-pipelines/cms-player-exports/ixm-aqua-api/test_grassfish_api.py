import os, json, requests
from dotenv import load_dotenv

load_dotenv()
token_resp = requests.post(
    url = "https://identity.as01.signageplayer.app/connect/token",
    data = {'grant_type':'client_credentials',
            'client_id':'gpiapi',
            'client_secret':'JW7ryRMHejLCAi!',
            'scope':'spconnect'}
    )

