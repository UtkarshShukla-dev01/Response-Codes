let currentSearchCodes = [];

document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("searchForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const responseCode = document.getElementById("responseCode").value.trim();
      const resultsDiv = document.getElementById("results");
      const saveListBtnContainer = document.getElementById(
        "saveListBtnContainer"
      );
      resultsDiv.innerHTML = ""; // Clear previous results
      currentSearchCodes = [];

      let codes = [];

      if (/^\d{3}$/.test(responseCode)) {
        codes.push(responseCode);
      } else if (/^\dxx$/.test(responseCode)) {
        let startDigit = responseCode[0];
        for (let i = 0; i <= 9; i++) {
          for (let j = 0; j <= 9; j++) {
            codes.push(`${startDigit}${i}${j}`);
          }
        }
      } else if (/^\d{2}x$/.test(responseCode)) {
        let startDigits = responseCode.slice(0, 2);
        for (let i = 0; i <= 9; i++) {
          codes.push(`${startDigits}${i}`);
        }
      } else {
        resultsDiv.innerHTML =
          "<p>Invalid format. Use '200', '2xx', '20x', etc.</p>";
        return;
      }

      currentSearchCodes = codes; // Store for saving list

      codes.forEach((code) => {
        let img = new Image();
        img.src = `https://http.dog/${code}.jpg`;
        img.alt = `Dog Image for ${code}`;
        img.onload = function () {
          let container = document.createElement("div");
          container.className = "image-container";
          container.innerHTML = `
                        <img src="${img.src}" alt="${img.alt}">
                        <p>${code}</p>
                    `;
          resultsDiv.appendChild(container);
        };
      });

      // Make the "Save This List" button visible after search
      saveListBtnContainer.style.display = "block";
    });
});

function saveList() {
  if (currentSearchCodes.length === 0) {
    alert("No search results to save.");
    return;
  }

  let listName = prompt("Enter a name for this list:");
  if (!listName) return;

  // Prepare filtered codes with their respective image URLs
  const filteredCodes = currentSearchCodes.map((code) => ({
    response_code: code,
    image_url: `https://http.dog/${code}.jpg`,
  }));

  const data = {
    listName: listName,
    filteredCodes: filteredCodes,
  };

  // Send the data to the server to save in the database
  console.log(data); // Log the request payload
  fetch("/save-list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Server response:", data); // Check the server response
      if (data.success) {
        alert("List saved successfully!");
      } else {
        alert("Failed to save the list.");
      }
    })
    .catch((error) => {
      console.error("Error saving list:", error);
      alert("An error occurred while saving the list.");
    });
}
