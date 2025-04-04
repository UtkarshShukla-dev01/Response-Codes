

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (!loginForm) {
    console.error("❌ Login form not found!");
    return;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      alert("⚠️ Please fill in all fields!");
      return;
    }

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data in sessionStorage
        sessionStorage.setItem("user", JSON.stringify(data.user));

        // Redirect to the specified URL or default to /search
        window.location.href = data.redirect || "/search";
      } else {
        alert(data.error || "❌ Login failed!");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      alert("⚠️ Network error! Please try again.");
    }
  });
});
