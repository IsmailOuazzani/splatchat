
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
You need to have 2 env files to deploy the API. The first, in this directory contains information to connect to the GCP instance.
The second, in the `api` directory, contains the secrets used by the API.
Ask Ismail to send them (they are secret 😉).

Then run:
```
make deploy-api
```

### Debugging
You can observe the logs of the service using:
```
make tail-api
```


# Splat Worker
This component is responsible for the processing of user data into gaussian splats. Currently, we run a [serverless RunPod](https://www.runpod.io/serverless-gpu) endpoint to do so.

## Local:
Start by building the gaussian splatting image (once):
```
docker build -t gsplat ./splatworker/Dockerfile.gsplat
```

To do some local testing and development (requires access to a GPU), navigate to the `splatworker` directory, create the appropriate directories and run the container:
```
mkdir results input out

docker run -it --rm --gpus all \
		--name gsplat \
		-v ./scripts:/ws/scripts \
		-v ./out:/ws/out \
        -v ./results:/results \
		-v ./input:/ws/in \
		-p 8080:8080 \
    --shm-size 16gb \
		gsplat-dev
```

You can now place the video to process in the input folder from your host machine, then run the following from the container:
```
python run_pipeline.py
```

## Deploy serverless
Will add instructions later


