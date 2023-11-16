## How to test:
Require Node v18.x or upper version
1. Copy `env.example` to `.env`, then config your AWS S3 info in this file

2. ```npm i```, then ```npm start```

3. Example code in Front-end:

```javascript
async function postImage(image) {
  const formData = new FormData();
  formData.append("image", image);

  const url = "http://localhost:8080/image";

  return await fetch(url, {
    method: "POST",
    body: formData,
  })
}
```