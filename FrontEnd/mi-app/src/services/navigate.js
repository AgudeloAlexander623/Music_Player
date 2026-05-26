let navigateFn = null;

export function setNavigate(fn) {
  navigateFn = fn;
}

export function navigate(path) {
  if (navigateFn) {
    navigateFn(path);
  } else {
    window.location.href = path;
  }
}
