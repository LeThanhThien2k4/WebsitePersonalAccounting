import jwt from "jsonwebtoken";

export default function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });

  const token = header.split(" ")[1];
  console.log("🧩 Token nhận được:", token);
  console.log("🔐 JWT_SECRET hiện tại:", process.env.JWT_SECRET);

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("❌ Token không hợp lệ:", err.message);
      return res.status(401).json({ error: "Invalid token" });
    }
    console.log("✅ Token hợp lệ, user:", decoded);
    req.user = decoded;
    next();
  });
}
