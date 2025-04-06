import { promises as fs } from "fs";
import path from "path";

export async function POST(req) {
  try {
    const { userId } = await req.json();

    // Resolve the correct path to store UserId.txt inside the Final folder
    const filePath = path.resolve(process.cwd(), "Final", "UserId.txt");

    console.log("Received userId:", userId); // Debugging
    console.log("File path:", filePath); // Debugging

    // Ensure the Final folder exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write user ID to the file (overwrite existing content)
    await fs.writeFile(filePath, userId, "utf8");

    return new Response(JSON.stringify({ message: "User ID saved successfully!", userId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error saving UserId:", error);
    return new Response(JSON.stringify({ error: "Failed to save User ID" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
