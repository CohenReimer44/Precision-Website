(function () {
  var modelScroll = document.getElementById("model-scroll");
  var modelCopy = document.querySelector(".model-copy");
  var processItems = document.querySelectorAll(".process-item");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function syncOverlayLabels() {
    if (!modelCopy || !modelScroll) return;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var stageBox = modelScroll.getBoundingClientRect();
    var stageVisible = stageBox.top < vh * 0.85 && stageBox.bottom > vh * 0.2;
    modelCopy.classList.toggle("is-visible", stageVisible);
  }

  function syncProcessScroll() {
    if (!processItems.length) return;
    if (reduceMotion) {
      processItems.forEach(function (item) {
        item.style.setProperty("--p", "1");
      });
      return;
    }
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var start = vh * 0.92;
    var end = vh * 0.38;
    var span = start - end || 1;
    processItems.forEach(function (item) {
      var top = item.getBoundingClientRect().top;
      var p = (start - top) / span;
      if (p < 0) p = 0;
      else if (p > 1) p = 1;
      item.style.setProperty("--p", p.toFixed(3));
    });
  }

  function onScrollFrame() {
    syncOverlayLabels();
    syncProcessScroll();
  }

  syncOverlayLabels();
  syncProcessScroll();
  window.addEventListener("scroll", onScrollFrame, { passive: true });
  window.addEventListener("resize", onScrollFrame);

  var menuToggle = document.getElementById("menu-toggle");
  var mobileNav = document.getElementById("site-menu");

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      menuToggle.textContent = open ? "Close" : "Menu";
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = "Menu";
      });
    });
  }

  var moreButton = document.getElementById("view-more");
  var extraWork = document.getElementById("work-extra");

  if (moreButton && extraWork) {
    moreButton.addEventListener("click", function () {
      var open = extraWork.classList.toggle("is-open");
      moreButton.setAttribute("aria-expanded", open ? "true" : "false");
      moreButton.textContent = open ? "Show less" : "Show more";
    });
  }

  var form = document.getElementById("quote-form");
  var success = document.getElementById("quote-success");
  var resetButton = document.getElementById("quote-reset");

  if (!form || !success) return;

  var alertBox = document.getElementById("form-alert");
  var alertList = document.getElementById("form-alert-list");
  var successTitle = document.getElementById("success-title");
  var fieldOrder = ["name", "address", "phone", "email", "description"];

  function clearErrors() {
    fieldOrder.forEach(function (field) {
      var input = document.getElementById(field);
      var error = document.getElementById(field + "-error");
      if (input) input.removeAttribute("aria-invalid");
      if (error) {
        error.textContent = "";
        error.classList.add("hidden");
      }
    });
    if (alertBox) alertBox.classList.add("hidden");
    if (alertList) alertList.innerHTML = "";
  }

  function showError(field, message) {
    var input = document.getElementById(field);
    var error = document.getElementById(field + "-error");
    if (input) input.setAttribute("aria-invalid", "true");
    if (error) {
      error.textContent = message;
      error.classList.remove("hidden");
    }
    return { field: field, message: message };
  }

  function validate() {
    var errors = [];
    var name = document.getElementById("name").value.trim();
    var address = document.getElementById("address").value.trim();
    var phone = document.getElementById("phone").value.trim();
    var email = document.getElementById("email").value.trim();
    var description = document.getElementById("description").value.trim();

    if (name.length < 2) {
      errors.push(showError("name", "Enter the name we should ask for."));
    }
    if (address.length < 5) {
      errors.push(
        showError("address", "Enter the property address so a visit has somewhere to land.")
      );
    }
    if (phone.replace(/\D/g, "").length < 10) {
      errors.push(showError("phone", "Enter a phone number with at least 10 digits."));
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(
        showError("email", "That email looks incomplete. Clear it if a call is enough.")
      );
    }
    if (description.length > 600) {
      errors.push(showError("description", "Keep the note under 600 characters."));
    }

    return {
      errors: errors,
      values: {
        name: name,
        address: address,
        phone: phone,
        email: email,
        description: description,
      },
    };
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearErrors();
    var result = validate();

    if (result.errors.length) {
      if (alertBox && alertList) {
        alertBox.classList.remove("hidden");
        result.errors.forEach(function (entry) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = "#" + entry.field;
          a.textContent = entry.message;
          li.appendChild(a);
          alertList.appendChild(li);
        });
      }
      var first = document.getElementById(result.errors[0].field);
      if (first) first.focus();
      return;
    }

    document.getElementById("success-name").textContent = result.values.name;
    document.getElementById("success-address").textContent = result.values.address;
    document.getElementById("success-phone").textContent = result.values.phone;
    document.getElementById("success-email").textContent =
      result.values.email || "Not provided";
    document.getElementById("success-note").textContent =
      result.values.description || "No note added.";

    form.classList.add("hidden");
    success.classList.remove("hidden");
    if (successTitle) successTitle.focus();
  });

  fieldOrder.forEach(function (field) {
    var input = document.getElementById(field);
    if (!input) return;
    input.addEventListener("input", function () {
      var error = document.getElementById(field + "-error");
      input.removeAttribute("aria-invalid");
      if (error) {
        error.textContent = "";
        error.classList.add("hidden");
      }
    });
  });

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      form.reset();
      clearErrors();
      success.classList.add("hidden");
      form.classList.remove("hidden");
      document.getElementById("name").focus();
    });
  }
})();
