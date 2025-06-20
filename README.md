# E-commerce Microservice Architecture Project

A comprehensive, event-driven microservice backend for a modern e-commerce platform. This project was built as a practical implementation of a scalable, resilient, and high-performance system, based on the architecture and technologies required for a senior backend developer role.

## Architecture Overview

The system is designed with a decoupled, event-driven architecture. Services communicate asynchronously via a message broker, ensuring high availability and scalability.

```
+----------------+      +----------+      +--------------------+
|   API Client   |----->|  Product |----->|     MongoDB        |
| (e.g., Web App)|      |  Service |      | (Primary Database) |
+----------------+      |   (REST) |      +--------------------+
                        +----------+      +--------------------+
                               |          |      Redis         |
                               |          |     (Cache)        |
                               |          +--------------------+
                               v
                        +----------------+
                        | RabbitMQ       |
                        | (Event Broker) |
                        +----------------+
                               |
            +------------------+------------------+
            |                                     |
            v                                     v
+------------------------+          +--------------------------+
| Notification Service   |          |  Search Indexer Service  |
| (Cache Invalidation)   |          |  (Data Sync to Search)   |
+------------------------+          +--------------------------+
            |                                     |
            v                                     v
+------------------------+          +--------------------------+
|         Redis          |          |      Elasticsearch       |
|  (Executes Deletes)    |          |   (Full-Text Search)     |
+------------------------+          +--------------------------+

```

## Technology Stack

- **Backend:** Node.js, TypeScript, Express.js
- **Databases:** MongoDB, Redis (for Caching), Elasticsearch (for Search)
- **Messaging:** RabbitMQ (Event Broker, Pub/Sub Pattern)
- **Containerization:** Docker, Docker Compose
- **Orchestration:** Kubernetes (using Minikube for local cluster)
- **DevOps & Tooling:** `kubectl`, Kibana

## Quality & Tooling

The repository is configured with ESLint for static analysis and Prettier for deterministic code formatting.

 - **ESLint:** Enforces strict, type-aware rules to prevent bugs.
 - **Prettier:** Handles all code styling rules.
 - **Automation:** Git hooks are configured to enforce standards on every commit.

### Available Scripts

Run these from the root directory:

- `npm run lint`: Run static analysis on all `.ts` files.
- `npm run lint:fix`: Attempt to auto-fix linting errors.
- `npm run format`: Check for formatting violations.
- `npm run format:fix`: Auto-format all relevant files.

## Prerequisites

Before you begin, ensure you have the following tools installed on your Debian-based Linux system (e.g., Ubuntu, Mint).

- **Git:**
  ```bash
  sudo apt-get update && sudo apt-get install -y git
  ```
- **cURL:**
  ```bash
  sudo apt-get install -y curl
  ```
- **Node.js & npm:**
  ```bash
  curl -fsSL [https://deb.nodesource.com/setup_lts.x](https://deb.nodesource.com/setup_lts.x) | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- **Docker & Docker Compose:**
  ```bash
  sudo apt-get install -y docker.io docker-compose
  sudo usermod -aG docker ${USER}
  # IMPORTANT: Log out and log back in for the group change to take effect.
  ```
- **kubectl:**
  ```bash
  curl -LO "[https://dl.k8s.io/release/$(curl](https://dl.k8s.io/release/$(curl) -L -s [https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl](https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl)"
  sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
  ```
- **Minikube:**
  ```bash
  curl -Lo minikube [https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64](https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64)
  sudo install minikube /usr/local/bin/
  ```

## Setup and Installation

First, clone the repository:
```bash
git clone https://github.com/mkopa/ecommerce-system.git
cd ecommerce-system
```

### I. Development Environment (Docker Compose)

This setup is optimized for rapid development with hot-reloading.

1.  **Install Local Dependencies:**
    While the services run in Docker, installing dependencies locally provides better IDE support (e.g., for VS Code IntelliSense).
    ```bash
    cd product-service && npm install && cd ..
    cd notification-service && npm install && cd ..
    cd search-indexer-service && npm install && cd ..
    ```

2.  **Run the System:**
    This command will build all the custom images and start all services defined in `docker-compose.yml` and `docker-compose.override.yml`.
    ```bash
    docker-compose up --build
    ```
    The system is now running. The Product Service API is available at `http://localhost:3000`.

### II. Production Simulation (Kubernetes)

This setup deploys the entire architecture to a local Kubernetes cluster, simulating a production environment.

1.  **Start the Minikube Cluster:**
    We will create a powerful local cluster with sufficient resources for our entire stack.
    ```bash
    minikube start --memory=8192 --cpus=4 --driver=docker
    ```

2.  **Set Docker Environment:**
    This critical step points your local Docker client to the Docker daemon inside the Minikube cluster.
    ```bash
    eval $(minikube -p minikube docker-env)
    ```
    **Remember:** You need to run this command in every new terminal session where you want to build images for Minikube.

3.  **Build Custom Service Images:**
    Now, build the images for our custom microservices. They will be built directly inside Minikube's environment.
    ```bash
    docker build -t product-service:latest ./product-service
    docker build -t notification-service:latest ./notification-service
    docker build -t search-indexer-service:latest ./search-indexer-service
    ```

4.  **Deploy to Kubernetes:**
    Apply all the Kubernetes manifest files located in the `k8s/` directory.
    ```bash
    kubectl apply -f k8s/
    ```

5.  **Check Deployment Status:**
    It may take a few minutes for all containers to start and become healthy.
    ```bash
    kubectl get pods --watch
    ```
    Wait until all pods have a `STATUS` of `Running` and `READY` counts are `1/1`.

## Usage & API Testing

Once the system is running on Kubernetes, you need to get the externally accessible URL for the `product-service`.

1.  **Get the Service URL:**
    ```bash
    export PRODUCT_API_URL=$(minikube service product-service --url)
    echo "API is available at: $PRODUCT_API_URL"
    ```

2.  **Create a New Product:**
    ```bash
    curl -X POST "$PRODUCT_API_URL/api/products" \
    -H "Content-Type: application/json" \
    -d '{"name": "Pro Smartwatch Series X", "description": "Latest smartwatch with advanced health tracking", "price": 2499, "sku": "SW-PRO-X-01"}'
    ```
    **Note the `_id` from the response for the next steps.**

3.  **Search for the Product:**
    Test the Elasticsearch endpoint. The `fuzziness` feature will even handle typos.
    ```bash
    curl "$PRODUCT_API_URL/api/products/search?q=smartwath"
    ```

4.  **Test the Cache (HIT/MISS):**
    ```bash
    # First request will be a CACHE MISS
    curl "$PRODUCT_API_URL/api/products/<your_product_id>"

    # Second request will be a CACHE HIT
    curl "$PRODUCT_API_URL/api/products/<your_product_id>"
    ```
    *(Check the logs of the `product-service` pod to see the HIT/MISS messages: `kubectl logs -l app=product-service -f`)*

5.  **Test Cache Invalidation:**
    Update the product to trigger the event-driven invalidation.
    ```bash
    # Update the price
    curl -X PUT "$PRODUCT_API_URL/api/products/<your_product_id>" \
    -H "Content-Type: application/json" \
    -d '{"price": 2599}'

    # The next request will be a CACHE MISS again, as the cache was cleared
    curl "$PRODUCT_API_URL/api/products/<your_product_id>"
    ```
    *(Check the logs of `notification-service` to see the "CACHE INVALIDATED" message: `kubectl logs -l app=notification-service -f`)*

---