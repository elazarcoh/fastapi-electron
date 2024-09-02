from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
import os
from seamless import render
from seamless.middlewares import ASGIMiddleware
from components.app import App

HERE = Path(__file__).parent

HOST = os.getenv("HOST")
if HOST is None:
    raise ValueError("HOST environment variable is not set")

PORT = os.getenv("PORT")
if PORT is None:
    raise ValueError("PORT environment variable is not set")
PORT = int(PORT)

app = FastAPI()
app.add_middleware(ASGIMiddleware)


@app.get("/static/{file_path:path}")
def read_static(file_path: str):
    return FileResponse(HERE / "static" / file_path)


@app.get("/{full_path:path}", response_class=HTMLResponse)
def read_root():
    return render(App())


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
