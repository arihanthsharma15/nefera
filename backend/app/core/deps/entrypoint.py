from fastapi import Header, HTTPException

def require_entrypoint(expected: str):
    def checker(x_nefera_entrypoint: str = Header(...)):
        if x_nefera_entrypoint != expected:
            raise HTTPException(status_code=404)
        return x_nefera_entrypoint
    return checker
