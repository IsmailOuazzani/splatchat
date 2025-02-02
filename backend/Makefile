include .env
export $(shell sed 's/=.*//' .env)

deploy-api:
	@echo "🚀 Deploying FastAPI to GCP..."
	rsync -avz --chown=$(GCP_USER):$(GCP_USER) --chmod=Du=rwx,Dgo=,Fu=rw,Fgo= -e "ssh -i $(SSH_KEY)" --exclude 'venv' --exclude '__pycache__' "$(API_DIR)/" "$(GCP_USER)@$(GCP_IP):$(GCP_DIR)/"
	ssh -i $(SSH_KEY) $(GCP_USER)@$(GCP_IP) "bash -c ' \
		cd $(GCP_DIR) && \
		source venv/bin/activate && \
		pip install -r requirements.txt && \
		sudo systemctl restart fastapi && \
		sudo systemctl status fastapi --no-pager \
	'"
	@echo "✅ FastAPI Deployment Complete!"

tail-api:
	@echo "📜 Tailing FastAPI logs from GCP..."
	ssh -i $(SSH_KEY) $(GCP_USER)@$(GCP_IP) "sudo journalctl -u fastapi -f --no-pager"