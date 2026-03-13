{
  let $i;
  let $j;
  let $a = Array.from({
    length: 10
  }, () => Array.from({
    length: 10
  }, () => 0));
  $i = -1;
  while ($i < 9) {
    $i = $i + 1;
    $j = 0;
    while ($j < 10) {
      if ($j < 5) $a[$i][$j] = 0;else $a[$i][$j] = 1;
      console.log($a[$i][$j]);
      $j = $j + 1;
    }
  }
  $i = 0;
  do {
    if ($i == 5) break;
    $i = $i + 1;
  } while ($i < 10);
}