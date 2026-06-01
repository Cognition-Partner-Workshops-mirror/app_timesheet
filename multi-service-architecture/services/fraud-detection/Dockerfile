# Dockerfile for the Python ML fraud detection service.
# Generates proper protobuf code from shared .proto definitions,
# then runs the gRPC server with the trained ML model.

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for numpy/scikit-learn compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for Docker layer caching
COPY services/fraud-detection/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY services/fraud-detection/ .

# Copy shared proto definition and generate proper Python protobuf code
# (overwrites hand-written stubs with protobuf-generated code)
COPY proto/fraud.proto /tmp/proto/fraud.proto
RUN python -m grpc_tools.protoc \
    -I/tmp/proto \
    --python_out=./src/proto \
    --grpc_python_out=./src/proto \
    /tmp/proto/fraud.proto && \
    sed -i 's/^import fraud_pb2/from . import fraud_pb2/' ./src/proto/fraud_pb2_grpc.py

# Expose gRPC port
EXPOSE 50052

# Run the fraud detection gRPC server
CMD ["python", "-m", "src.grpc_server"]
