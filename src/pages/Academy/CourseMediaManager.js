
const courses = {
  'formacao-interna-produtos-e-servicos-da-africell': {
    path: '/media/Modulo1/index.html',
    cover: '/media/Modulo1/cover.jpeg'
  }
};

export function CourseMediaManager(course) {
  const result = courses[course] || '/placeholder.png';
  return result;
}
