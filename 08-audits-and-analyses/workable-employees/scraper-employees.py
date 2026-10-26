import requests

subdomain = "giant-pumpkin"
headers={
    "accept":"application/json",
    "Authorization":"Bearer"
}
request = requests.get('https://{subdomain}.workable.com/spi/v3/employees',
                       headers={
                           
                       })