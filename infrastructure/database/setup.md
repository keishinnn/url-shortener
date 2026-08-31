# PostgreSQL Setup Guide

To allow our Dockerized Node.js containers to communicate with the host's PostgreSQL database, the following configurations must be applied to the host machine.

## 1. Find the Docker Gateway

Find the Docker bridge network gateway IP (usually `172.18.0.1` or `172.17.0.1`):
`docker inspect -f '{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}' backend-1`

## 2. Configure postgresql.conf

**Location:** `/etc/postgresql/<version>/main/postgresql.conf`

Find the `listen_addresses` line, uncomment it, and add the Docker gateway IP:

```ini
listen_addresses = 'localhost, 172.18.0.1'
```

## 3. Configure pg_hba.conf

**Location:** `/etc/postgresql/<version>/main/pg_hba.conf`

Add the Docker container subnet to the bottom of the file to allow authentication:

# Allow Docker Compose network connections
host    all             all             172.18.0.0/16           scram-sha-256

## 4. Restart PostgreSQL

`sudo systemctl restart postgresql`



