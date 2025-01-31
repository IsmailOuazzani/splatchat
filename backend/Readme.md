
# API
## Local
### Installation
Create a virtual environment:
```
python3.10 -m venv venv
source venv/bin/activate
```

Install requirements:
```
pip install -r requirements.txt
```
### Usage
Run the server:
```
fastapi dev main.py --host 0.0.0.0
```


## On the cloud
## Provisionning a new Google Cloud compute instance
Start by creating a new [google cloud compute instance](https://cloud.google.com/compute/docs/instances/create-start-instance).
The following settings have worked in the past (and are the cheapest):
- machine type: `e2-micro`
- image: ubuntu 24.04 LTS, with 10-20 GB of drive space
- firewalls: Allow `http` traffic (or in prod, only `https` traffic)

After creating the instance, you can also attach a static external ip address (necessary for domain name to point to it), by following [this guide](https://cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address). Make sure you create th address in the same region, and assign it immediatly to the instance (unused ip addresses are much more costly).


Once you created the instance, generate your ssh keys to connect to it programmatically. On your host machine, replace with your **username** (you can get it by ssh once through the browser) and run:
```
ssh-keygen -t rsa -b 4096 -C "ouazzani_ismail2002" -f ~/.ssh/gcloud_private_key
```
Find your public key:
```
cat ~/.ssh/gcloud_private_key.pub
```
Then click on your instance > Edit > Add Item button (in the ssh key section) and paste the public key. **Reboot the instance** for the change to appear.


And then, pray Ismail is awake cuz there no way Im writing a makefile for this rn.

## Deploying to provisionned Google Cloud compute instance
If you have already provisionned the compute instance, create an ENV file with the variables for the Makefile.
Ask Ismail to send it (its a secret 😉).

Then run:
```
make deploy-api
```

### Debugging
You can observe the logs of the service using:
```
make tail-api
```