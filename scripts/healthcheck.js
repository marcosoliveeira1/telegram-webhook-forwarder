import http from "node:http";

const req = http.get("http://localhost:3000/health", res => {
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

req.on("error", () => process.exit(1));

req.setTimeout(3000, () => {
    req.destroy();
    process.exit(1);
});
