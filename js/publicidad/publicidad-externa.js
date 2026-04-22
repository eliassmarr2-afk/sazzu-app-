(function () {
    const PAGE_FILE = "publicidad-externa.html";
  
    function currentFile_() {
      return (location.pathname.split("/").pop() || "").toLowerCase();
    }
  
    function mount_() {
      if (currentFile_() !== PAGE_FILE) return;
      console.log("[publicidad-externa] montado");
    }
  
    document.addEventListener("DOMContentLoaded", mount_);
    document.addEventListener("sazzu:page:load", mount_);
  })();