const countPages = (jobs) => {
  let customers = new Set();

  for (let job of jobs) {
    customers.add(job.customer);
  }

  const pendingJobs = jobs.filter((j) => j.status === "pending");

  let result = [];

  for (let customer of customers) {
    let pages = 0;
    let jobCount = 0;
    pendingJobs.forEach((j) => {
      if (j.customer !== customer) return;
      pages += j.pages;
      jobCount += 1;
    });

    result.push({
      totalPages: pages,
      jobCount: jobCount,
    });
  }

  return result;
};



const filterOrders = (orders) => {
  const filteredOrders = [];

  for (o of orders) {
    const masterOrder = filteredOrders.find((fo) => fo.customer === o.customer);
    masterOrder ? (masterOrder.amount += o.amount) : filteredOrders.push(o);
  }

  return filteredOrders;
};

const removeDuplicates = (arr) => {
    //return new Set(arr) -- possible solution
    const newArr = [];
    arr.forEach((e) => !newArr.includes(e) && newArr.push(e))
    return newArr
}


const checkIfPalindrome = (str) => {
    return (str === str.reverse())
}

