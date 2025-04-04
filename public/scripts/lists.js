document.addEventListener("DOMContentLoaded", function () {
  loadLists();
});

// Load the saved lists from the database
function loadLists() {
  const listsContainer = document.getElementById("listsContainer");
  listsContainer.innerHTML = "";

  // Fetch the lists from the server and display them
  fetch("/lists")
    .then((response) => response.json())
    .then((data) => {
      if (data.lists.length === 0) {
        listsContainer.innerHTML = "<p>No saved searches available.</p>";
      } else {
        data.lists.forEach((list) => {
          let listElement = document.createElement("div");
          listElement.className = "list-item";
          listElement.innerHTML = `
            <p><strong>${list.name}</strong> (Created on: ${list.date})</p>
            <button onclick="viewList(${list.id})">View</button>
            <button onclick="deleteList(${list.id})">Delete</button>
          `;
          listsContainer.appendChild(listElement);
        });
      }
    })
    .catch((error) => {
      console.error("Error loading lists:", error);
      listsContainer.innerHTML = "<p>Failed to load saved lists.</p>";
    });
}

// View the details of a specific list
function viewList(listId) {
  fetch(`/list-details/${listId}`)
    .then((response) => response.json())
    .then((data) => {
      const list = data.list;
      document.getElementById("listName").innerText = list.name;
      document.getElementById("listDate").innerText = list.date;

      let listImages = document.getElementById("listImages");
      listImages.innerHTML = "";
      list.codes.forEach((code) => {
        let img = document.createElement("img");
        img.src = `https://http.dog/${code}.jpg`;
        img.alt = `Dog Image for ${code}`;
        listImages.appendChild(img);
      });

      document.getElementById("listsContainer").classList.add("hidden");
      document.getElementById("listDetails").classList.remove("hidden");
    })
    .catch((error) => {
      console.error("Error viewing list:", error);
      alert("Error loading list details.");
    });
}

// Delete a specific list
function deleteList(listId) {
  if (!confirm("Are you sure you want to delete this search?")) return;

  fetch(`/delete-list/${listId}`, {
    method: "DELETE",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        loadLists(); // Reload the lists after deletion
      } else {
        alert("Error deleting the list.");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error deleting the list.");
    });
}

// Go back to the list of saved searches
function backToLists() {
  document.getElementById("listsContainer").classList.remove("hidden");
  document.getElementById("listDetails").classList.add("hidden");
}
