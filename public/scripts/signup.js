// signup.js

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.text();
    alert(result);
  } catch (error) {
    console.error("❌ Signup error:", error);
    alert("⚠️ An error occurred during sign up. Please try again.");
  }
});
